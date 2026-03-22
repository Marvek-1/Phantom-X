/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This file defines the main `gdm-map-app` LitElement component.
 * This component is responsible for:
 * - Rendering the user interface, including the Cesium 3D Map,
 *   chat messages area, and user input field.
 * - Managing the state of the chat (e.g., idle, generating, thinking).
 * - Handling user input and sending messages to the Gemini AI model.
 * - Processing responses from the AI, including displaying text and handling
 *   function calls (tool usage) related to map interactions.
 * - Integrating with CesiumJS to load and control the map,
 *   display markers, corridors, and terrain.
 * - Providing the `handleMapQuery` method, which is called by the MCP server
 *   (via index.tsx) to update the map based on AI tool invocations.
 */

// Cesium JS: Used for 3D terrain and geospatial visualization.
import * as Cesium from 'cesium';
import hljs from 'highlight.js';
import {html, LitElement, PropertyValueMap} from 'lit';
import {customElement, query, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {Marked} from 'marked';
import {markedHighlight} from 'marked-highlight';

import {MapParams} from './mcp_maps_server';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  serverTimestamp,
  query as fsQuery,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
  setDoc,
  doc
} from './src/firebase';

/** Markdown formatting function with syntax hilighting */
export const marked = new Marked(
  markedHighlight({
    async: true,
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, {language}).value;
    },
  }),
);

const CENTROIDS: Record<string, [number, number]> = {
  ET: [9.14, 40.49], SS: [6.87, 31.31], NG: [9.08, 8.68],
  NE: [17.61, 8.08], CF: [6.61, 20.94], SD: [12.86, 30.22],
  CD: [-4.03, 21.76], CG: [-0.23, 15.83], SS2: [6.87, 31.31],
  CM: [3.85, 11.50], SO: [5.15, 46.20], KE: [-0.02, 37.91],
};

function getCountryCentroidPath(c: any, CesiumObj: typeof Cesium): Cesium.Cartesian3[] {
  const sCC = c.start_country?.toUpperCase() || '';
  const eCC = c.end_country?.toUpperCase() || '';
  const sc = CENTROIDS[sCC] ?? [0, 0];
  const ec = CENTROIDS[eCC] ?? [0, 0];
  const pts: number[] = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    pts.push(sc[1] + (ec[1] - sc[1]) * t, sc[0] + (ec[0] - sc[0]) * t);
  }
  return CesiumObj.Cartesian3.fromDegreesArray(pts);
}

const ICON_BUSY = html`<svg
  class="rotating"
  xmlns="http://www.w3.org/2000/svg"
  height="24px"
  viewBox="0 -960 960 960"
  width="24px"
  fill="currentColor">
  <path
    d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-155.5t86-127Q252-817 325-848.5T480-880q17 0 28.5 11.5T520-840q0 17-11.5 28.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-17 11.5-28.5T840-520q17 0 28.5 11.5T880-480q0 82-31.5 155t-86 127.5q-54.5 54.5-127 86T480-80Z" />
</svg>`;

/**
 * Chat state enum to manage the current state of the chat interface.
 */
export enum ChatState {
  IDLE,
  GENERATING,
  THINKING,
  EXECUTING,
}

/**
 * Chat tab enum to manage the current selected tab in the chat interface.
 */
enum ChatTab {
  GEMINI,
  BRIEF,
}

/**
 * Chat role enum to manage the current role of the message.
 */
export enum ChatRole {
  USER,
  ASSISTANT,
  SYSTEM,
}

// Cesium Ion Token: Use environment variable if available
const CESIUM_ION_TOKEN: string = process.env.CESIUM_ION_TOKEN || '';
if (CESIUM_ION_TOKEN) {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

const EXAMPLE_PROMPTS = [
  "Analyze the corridor between Village Lwanda (KE) and Village Bunda (TZ).",
  "Ingest disease intelligence signals from Kenya.",
  "Show me the forest junction near the border of Kenya and Tanzania.",
  "What is the explainability trace for CORRIDOR-KE-TZ-047?",
  "Analyze cross-border mobility patterns in the Goma-Gisenyi region.",
  "Show me the most likely informal crossings near the Three Gorges Dam.",
  "Ingest signals from the AFRO Sentinel system for Uganda.",
  "Analyze the corridor intelligence for the northernmost capital city.",
];

/**
 * MapApp component for Photorealistic 3D Maps.
 */
@customElement('gdm-map-app')
export class MapApp extends LitElement {
  @query('#anchor') anchor?: HTMLDivElement;
  @query('#cesiumContainer') cesiumContainerElement?: HTMLElement;
  @query('#messageInput') messageInputElement?: HTMLInputElement;

  @state() chatState = ChatState.IDLE;
  @state() isRunning = true;
  @state() selectedChatTab = ChatTab.GEMINI;
  @state() inputMessage = '';
  @state() messages: HTMLElement[] = [];
  @state() mapInitialized = false;
  @state() mapError = '';
  @state() corridorAnalysis: any = null;
  @state() signalData: any = null;
  @state() sidebarCollapsed = false;
  @state() tooltipContent: any = null;
  @state() tooltipPosition = {x: 0, y: 0};
  @state() showTooltip = false;
  @state() user: FirebaseUser | null = null;
  @state() isThinkingMode = false;
  @state() isRecording = false;
  @state() isAuthReady = false;
  @state() radarActive = false;
  @state() selectedElement: any = null;
  @state() radarLocation: {lat: number, lng: number} | null = null;
  @state() monitoredId: string | null = null;
  @state() terrainRelief = false;
  @state() terrainExaggeration = 1.0;
  @state() sketchMode = false;
  @state() lane: { mode: string; badge_color: string } | null = null;
  @state() corridors: any[] = [];
  @state() pendingDetections: any[] = [];

  @state() latestRun: any = null;

  private _pollInterval: any;

  // Cesium: Instance of the Cesium Viewer.
  private viewer?: Cesium.Viewer;
  private entities: Map<string, Cesium.Entity> = new Map();
  private activeSketchPoints: Cesium.Cartesian3[] = [];
  private sketchEntity?: Cesium.Entity;
  private sketchHandler?: Cesium.ScreenSpaceEventHandler;

  sendMessageHandler?: CallableFunction;

  constructor() {
    super();
    // Set initial input from a random example prompt
    this.setNewRandomPrompt();
    this.setupAuth();
  }

  private setupAuth() {
    onAuthStateChanged(auth, async (user) => {
      this.user = user;
      this.isAuthReady = true;
      if (user) {
        // Ensure user document exists in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: user.displayName || 'Anonymous',
            email: user.email || '',
            photoURL: user.photoURL || '',
            role: 'client' // Default role
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      this.requestUpdate();
    });
  }

  async login() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          if (this.sendMessageHandler) {
            this.sendMessageHandler(base64Audio, 'user', true); // true indicates audio
          }
        };
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  createRenderRoot() {
    return this;
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    // Cesium: Load the map when the component is first updated.
    this.loadMap();
    this.fetchLane();
    this.startPolling();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
    }
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('corridors') || changedProperties.has('monitoredId')) {
      this._drawCorridors();
    }
  }

  async fetchLane() {
    try {
      const res = await fetch('/api/lane');
      if (res.ok) {
        const data = await res.json();
        this.lane = data.active_lane;
      }
    } catch (e) {
      console.error('Error fetching lane:', e);
    }
  }

  async startPolling() {
    try {
      const res = await fetch('/api/corridors');
      if (res.ok) {
        const data = await res.json();
        this.corridors = data.corridors || [];
      }
    } catch (e) {
      console.error('Error fetching corridors:', e);
    }

    const poll = async () => {
      try {
        const since = new Date(Date.now() - 35000).toISOString();
        const res = await fetch(`/api/poll?since=${since}`);
        if (res.ok) {
          const { updated_corridors, detections, latest_run, entropy_spikes } = await res.json();

          if (updated_corridors && updated_corridors.count > 0) {
            const map = new Map(this.corridors.map(c => [c.id, c]));
            for (const c of updated_corridors.items) map.set(c.id, c);
            this.corridors = [...map.values()];
          }
          if (detections && detections.count > 0) {
            this.pendingDetections = detections.items;
          }
          if (latest_run) {
            this.latestRun = latest_run;
          }
        }
      } catch (e) {
        console.error('Error polling:', e);
      }
    };

    this._pollInterval = setInterval(poll, 30000);
  }

  /**
   * Sets the input message to a new random prompt from EXAMPLE_PROMPTS.
   */
  private setNewRandomPrompt() {
    if (EXAMPLE_PROMPTS.length > 0) {
      this.inputMessage =
        EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    }
  }

  /**
   * Cesium: Initializes the Cesium Viewer with terrain and imagery.
   * Sets up the initial camera view over East Africa.
   */
  async loadMap() {
    if (!this.cesiumContainerElement) {
      console.error('Cesium container not ready.');
      return;
    }

    try {
      this.viewer = new Cesium.Viewer(this.cesiumContainerElement, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        timeline: false,
        animation: false,
      });

      // Set initial view over East Africa (KE-TZ border region)
      this.viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(34.13, -1.52, 180000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-60),
          roll: 0,
        },
      });

      // Setup picking handler
      const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
      handler.setInputAction((movement: any) => {
        const pickedObject = this.viewer!.scene.pick(movement.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id;
          this._handleEntityClick(entity);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Setup hover handler
      handler.setInputAction((movement: any) => {
        const pickedObject = this.viewer!.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id;
          this._handleEntityHover(entity, movement.endPosition);
        } else {
          this.showTooltip = false;
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      this.mapInitialized = true;
      this.mapError = '';
    } catch (error) {
      console.error('Error loading Cesium:', error);
      this.mapError = 'Could not load Cesium. Check console for details.';
      this.mapInitialized = false;
    }
    this.requestUpdate();
  }

  setChatState(state: ChatState) {
    this.chatState = state;
  }

  async saveChatTurn(role: 'user' | 'model', content: string, isThinking: boolean = false) {
    if (!this.user) return;
    try {
      await addDoc(collection(db, 'users', this.user.uid, 'chat_history'), {
        role,
        content,
        isThinking,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${this.user.uid}/chat_history`);
    }
  }

  private _handleElementClick(type: string, title: string, details: any[]) {
    this.selectedElement = { type, title, details };
    this.requestUpdate();
  }

  private _handleEntityClick(entity: Cesium.Entity) {
    const props = entity.properties;
    if (!props) return;

    const kind = props.kind?.getValue(this.viewer!.clock.currentTime);
    const id = entity.id;
    const title = props.title?.getValue(this.viewer!.clock.currentTime) || id;
    
    const details: {label: string, value: string}[] = [];
    props.propertyNames.forEach((name: string) => {
      if (name !== 'kind' && name !== 'title') {
        details.push({label: name, value: String(props[name].getValue(this.viewer!.clock.currentTime))});
      }
    });

    this._handleElementClick(kind, title, details);
  }

  private _handleEntityHover(entity: Cesium.Entity, position: Cesium.Cartesian2) {
    const props = entity.properties;
    if (!props) return;

    const kind = props.kind?.getValue(this.viewer!.clock.currentTime);
    const title = props.title?.getValue(this.viewer!.clock.currentTime) || entity.id;

    const rows: {label: string, value: string}[] = [];
    props.propertyNames.forEach((name: string) => {
      if (name !== 'kind' && name !== 'title') {
        rows.push({label: name, value: String(props[name].getValue(this.viewer!.clock.currentTime))});
      }
    });

    this.tooltipContent = { title, rows };
    this.tooltipPosition = {x: position.x + 15, y: position.y + 15};
    this.showTooltip = true;
    this.requestUpdate();
  }

  private _updateTerrainRelief() {
    if (!this.viewer) return;
    const scene = this.viewer.scene;

    if (this.terrainRelief) {
      const layer = {
        extendUpwards: true,
        extendDownwards: true,
        entries: [
          { height: 0, color: new Cesium.Color(0.20, 0.31, 0.19, 0.50) },
          { height: 500, color: new Cesium.Color(0.36, 0.53, 0.26, 0.45) },
          { height: 1200, color: new Cesium.Color(0.90, 0.85, 0.65, 0.40) },
          { height: 2000, color: new Cesium.Color(0.99, 0.78, 0.44, 0.40) },
          { height: 2800, color: new Cesium.Color(0.75, 0.62, 0.54, 0.45) },
          { height: 4000, color: new Cesium.Color(0.94, 0.94, 0.94, 0.50) },
        ],
      };
      scene.globe.material = Cesium.createElevationBandMaterial({
        scene: scene,
        layers: [layer],
      });
      scene.globe.enableLighting = true;
    } else {
      scene.globe.material = undefined as any;
      scene.globe.enableLighting = false;
    }
  }

  private _updateExaggeration() {
    if (!this.viewer) return;
    this.viewer.scene.verticalExaggeration = this.terrainExaggeration;
    this.viewer.scene.verticalExaggerationRelativeHeight = 0;
  }

  private _toggleSketchMode() {
    this.sketchMode = !this.sketchMode;
    if (this.sketchMode) {
      this._startSketch();
    } else {
      this._stopSketch();
    }
  }

  private _startSketch() {
    if (!this.viewer) return;
    this.activeSketchPoints = [];
    this.sketchHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

    this.sketchHandler.setInputAction((event: any) => {
      const ray = this.viewer!.camera.getPickRay(event.position);
      const position = this.viewer!.scene.globe.pick(ray!, this.viewer!.scene);
      if (Cesium.defined(position)) {
        this.activeSketchPoints.push(position);
        this._updateSketchEntity();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.sketchHandler.setInputAction((event: any) => {
      this._stopSketch();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  private _updateSketchEntity() {
    if (!this.viewer) return;
    if (this.sketchEntity) {
      this.viewer.entities.remove(this.sketchEntity);
    }

    if (this.activeSketchPoints.length > 1) {
      this.sketchEntity = this.viewer.entities.add({
        polyline: {
          positions: this.activeSketchPoints,
          clampToGround: true,
          width: 3,
          material: Cesium.Color.YELLOW,
        },
      });
    }
  }

  private _stopSketch() {
    if (this.sketchHandler) {
      this.sketchHandler.destroy();
      this.sketchHandler = undefined;
    }
    this.sketchMode = false;
    // In a real app, we'd save the sketch points as "analyst review geometry"
    console.log('Sketch finished:', this.activeSketchPoints);
  }

  private _drawCorridors() {
    if (!this.viewer) return;
    
    // Remove existing corridor entities
    for (const [id, entity] of this.entities.entries()) {
      if (id.startsWith('corridor-')) {
        this.viewer.entities.remove(entity);
        this.entities.delete(id);
      }
    }

    for (const cor of this.corridors) {
      const riskColor = cor.riskClass === 'CRITICAL' ? Cesium.Color.RED :
                        cor.riskClass === 'HIGH' ? Cesium.Color.ORANGERED :
                        cor.riskClass === 'MEDIUM' ? Cesium.Color.ORANGE : Cesium.Color.GREEN;
      
      let positions: Cesium.Cartesian3[] = [];
      if (cor.inferred_path_json) {
        try {
          const geo = JSON.parse(cor.inferred_path_json);
          const coords = geo.coordinates as [number, number][];
          positions = Cesium.Cartesian3.fromDegreesArray(coords.flatMap(([lng, lat]) => [lng, lat]));
        } catch {
          positions = getCountryCentroidPath(cor, Cesium);
        }
      } else {
        positions = getCountryCentroidPath(cor, Cesium);
      }

      if (positions.length < 2) continue;

      const isSel = this.monitoredId === cor.id;

      // Spine
      const sId = `corridor-spine-${cor.id}`;
      const spineEntity = this.viewer.entities.add({
        id: sId,
        properties: { corridorId: cor.id, kind: 'CORRIDOR', title: cor.id, Risk: cor.riskClass, Score: cor.score },
        polyline: {
          positions,
          clampToGround: true,
          width: isSel ? 4 : 2,
          material: riskColor.withAlpha(cor.activated ? (isSel ? 1.0 : 0.65) : 0.30)
        }
      });
      this.entities.set(sId, spineEntity);
    }
  }

  private _clearMapElements() {
    if (!this.viewer) return;
    this.viewer.entities.removeAll();
    this.entities.clear();
    this.radarActive = false;
    this.radarLocation = null;
  }

  /**
   * Primary interface for the MCP server (via index.tsx)
   * to trigger updates on the Cesium Map.
   * @param params An object containing parameters for the map query.
   */
  async handleMapQuery(params: MapParams) {
    if (!this.viewer) return;
    this._clearMapElements();

    if (params.lat !== undefined && params.lng !== undefined) {
      this.monitoredId = params.location || null;
      
      const position = Cesium.Cartesian3.fromDegrees(params.lng, params.lat);
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(params.lng, params.lat, params.range || 2000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0
        }
      });

      const marker = this.viewer.entities.add({
        position,
        point: {
          pixelSize: 10,
          color: Cesium.Color.GREEN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: params.location || 'Signal',
          font: '14pt monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        properties: {
          kind: 'SIGNAL',
          title: params.location || 'Signal',
          Latitude: params.lat,
          Longitude: params.lng,
          Status: 'Active Monitoring'
        }
      });
      this.entities.set(`signal-${Date.now()}`, marker);

      if (params.endLat !== undefined && params.endLng !== undefined) {
        // Corridor rendering
        const endPosition = Cesium.Cartesian3.fromDegrees(params.endLng, params.endLat);
        
        // Corridor line
        this.viewer.entities.add({
          polyline: {
            positions: [position, endPosition],
            width: 5,
            material: Cesium.Color.GREEN.withAlpha(0.5),
            clampToGround: true
          }
        });

        // Uncertainty ribbon
        const width = (params.totalKm || 10) * 50; // Fallback width
        this.viewer.entities.add({
          corridor: {
            positions: [position, endPosition],
            width: width,
            material: Cesium.Color.GREEN.withAlpha(0.1),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
      }
    }

    if (params.corridorAnalysis) {
      this.corridorAnalysis = params.corridorAnalysis;
      this._renderCorridorAnalysis(params.corridorAnalysis);
    }

    if (params.signals) {
      this.signalData = params.signals;
    }
  }

  private _renderCorridorAnalysis(analysis: any) {
    if (!this.viewer) return;

    const riskColor = analysis.riskClass === 'CRITICAL' ? Cesium.Color.RED :
                     analysis.riskClass === 'HIGH' ? Cesium.Color.ORANGERED :
                     analysis.riskClass === 'MEDIUM' ? Cesium.Color.ORANGE : Cesium.Color.GREEN;

    if (analysis.nodes && analysis.nodes.length > 1) {
      const positions = analysis.nodes.map((n: any) => Cesium.Cartesian3.fromDegrees(n.lng, n.lat));
      
      // Main corridor path
      this.viewer.entities.add({
        polyline: {
          positions,
          width: 8,
          material: riskColor.withAlpha(0.8),
          clampToGround: true
        },
        properties: {
          kind: 'CORRIDOR',
          title: analysis.id,
          Score: analysis.score,
          Risk: analysis.riskClass,
          Velocity: analysis.velocity
        }
      });

      // Uncertainty ribbon
      const width = analysis.totalKm * 100; // Simplified uncertainty
      this.viewer.entities.add({
        corridor: {
          positions,
          width: width,
          material: riskColor.withAlpha(0.15),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });

      // Nodes
      analysis.nodes.forEach((node: any) => {
        this.viewer!.entities.add({
          position: Cesium.Cartesian3.fromDegrees(node.lng, node.lat),
          point: {
            pixelSize: 8,
            color: Cesium.Color.CYAN,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: node.name,
            font: '10pt monospace',
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          properties: {
            kind: 'NODE',
            title: node.name,
            Type: node.type,
            Risk: node.risk,
            Population: node.pop
          }
        });
      });
    }
  }

  setInputField(message: string) {
    this.inputMessage = message.trim();
  }

  addMessage(role: string, message: string) {
    const div = document.createElement('div');
    div.classList.add('turn');
    div.classList.add(`role-${role.trim()}`);
    div.setAttribute('aria-live', 'polite');

    const thinkingDetails = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Thinking process';
    thinkingDetails.classList.add('thinking');
    thinkingDetails.setAttribute('aria-label', 'Model thinking process');
    const thinkingElement = document.createElement('div');
    thinkingDetails.append(summary);
    thinkingDetails.append(thinkingElement);
    div.append(thinkingDetails);

    const textElement = document.createElement('div');
    textElement.className = 'text';
    textElement.innerHTML = message;
    div.append(textElement);

    this.messages = [...this.messages, div];
    this.scrollToTheEnd();
    return {
      thinkingContainer: thinkingDetails,
      thinkingElement: thinkingElement,
      textElement: textElement,
    };
  }

  scrollToTheEnd() {
    if (!this.anchor) return;
    this.anchor.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }

  async sendMessageAction(message?: string, role?: string) {
    if (this.chatState !== ChatState.IDLE) return;

    let msg = '';
    let usedComponentInput = false; // Flag to track if component's input was used

    if (message) {
      // Message is provided programmatically
      msg = message.trim();
    } else {
      // Message from the UI input field
      msg = this.inputMessage.trim();
      // Clear the input field state only if we are using its content
      // and there was actual content to send.
      if (msg.length > 0) {
        this.inputMessage = '';
        usedComponentInput = true;
      } else if (
        this.inputMessage.trim().length === 0 &&
        this.inputMessage.length > 0
      ) {
        // If inputMessage contained only whitespace, clear it and mark as used.
        this.inputMessage = '';
        usedComponentInput = true;
      }
    }

    if (msg.length === 0) {
      // If the final message to send is empty (e.g., user entered only spaces, or an empty programmatic message)
      // set a new random prompt if the component's input was cleared.
      if (usedComponentInput) {
        this.setNewRandomPrompt();
      }
      return;
    }

    const msgRole = role ? role.toLowerCase() : 'user';

    // Add user's message to the chat display
    if (msgRole === 'user' && msg) {
      const {textElement} = this.addMessage(msgRole, '...');
      textElement.innerHTML = await marked.parse(msg);
    }

    // Send the message via the handler (to AI)
    if (this.sendMessageHandler) {
      await this.sendMessageHandler(msg, msgRole);
    }

    // If the component's main input field was used and cleared, set a new random prompt.
    if (usedComponentInput) {
      this.setNewRandomPrompt();
    }
  }

  private async inputKeyDownAction(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessageAction();
    }
  }

  render() {
    // Cesium: Initial camera parameters
    const initialCenter = '0,0,100'; // lat,lng,altitude
    const initialRange = '20000000'; // View range in meters
    const initialTilt = '45'; // Camera tilt in degrees
    const initialHeading = '0'; // Camera heading in degrees

    return html`<div class="gdm-map-app ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
      <div
        class="main-container"
        role="application"
        aria-label="Interactive Map Area">
        <div
          class="map-tooltip"
          style="display: ${this.showTooltip ? 'block' : 'none'}; left: ${this.tooltipPosition.x}px; top: ${this.tooltipPosition.y}px;">
          ${this.tooltipContent ? html`
            <div class="tooltip-header">${this.tooltipContent.title}</div>
            <div class="tooltip-body">
              ${this.tooltipContent.rows.map((row: any) => html`
                <div class="tooltip-row">
                  <span class="tooltip-label">${row.label}:</span>
                  <span class="tooltip-value">${row.value}</span>
                </div>
              `)}
            </div>
          ` : ''}
        </div>
        <div class="app-header">
          <div class="app-title">PHANTOM POE ENGINE</div>
          <div class="app-subtitle">Corridor Intelligence for Formal & Informal Cross-Border Mobility</div>
          <div class="auth-controls">
            ${this.user ? html`
              <div class="user-info">
                <img src="${this.user.photoURL || ''}" alt="Avatar" class="avatar">
                <span>${this.user.displayName}</span>
                <button @click="${this.logout}" class="btn-auth">Logout</button>
              </div>
            ` : html`
              <button @click="${this.login}" class="btn-auth">Login with Google</button>
            `}
          </div>
        </div>
        ${this.mapError
          ? html`<div
              class="map-error-message"
              role="alert"
              aria-live="assertive"
              >${this.mapError}</div
            >`
          : ''}
        <!-- Cesium: The core 3D Map container -->
        <div
          id="cesiumContainer"
          style="height: 100%; width: 100%;"
          aria-label="Cesium 3D Map Display"
          role="application">
        </div>

        <div class="map-controls">
          <div class="control-group">
            <label class="control-label">
              <input type="checkbox" .checked="${this.terrainRelief}" @change="${(e: any) => { this.terrainRelief = e.target.checked; this._updateTerrainRelief(); }}">
              <span>Terrain Relief</span>
            </label>
            <div class="control-help">Relief only — not full friction model</div>
          </div>
          <div class="control-group">
            <label class="control-label">Exaggeration: ${this.terrainExaggeration.toFixed(1)}x</label>
            <input type="range" min="1" max="5" step="0.5" .value="${this.terrainExaggeration}" @input="${(e: any) => { this.terrainExaggeration = parseFloat(e.target.value); this._updateExaggeration(); }}">
          </div>
          <div class="control-group">
            <button class="btn-control ${this.sketchMode ? 'active' : ''}" @click="${this._toggleSketchMode}">
              ${this.sketchMode ? 'Stop Sketch' : 'Sketch Corridor'}
            </button>
          </div>
        </div>

        ${this.radarActive ? html`
          <div class="radar-status-overlay">
            <div class="radar-ping"></div>
            <div class="radar-text">
              ACTIVE MONITORING: 
              ${this.monitoredId ? 
                html`${this.monitoredId} · ${this.monitoredId.includes('KE-TZ') ? 'Lwanda KE → Bunda TZ' : this.monitoredId}` : 
                html`${this.radarLocation?.lat.toFixed(4)}, ${this.radarLocation?.lng.toFixed(4)}`}
            </div>
          </div>
        ` : ''}

        ${this.corridorAnalysis ? html`
          <div class="analysis-overlay">
            <div class="analysis-header">
              <div class="header-main">
                <span class="corridor-id">${this.corridorAnalysis.id}</span>
                <span class="latent-state-badge state-${this.corridorAnalysis.latentState?.toLowerCase()}">${this.corridorAnalysis.latentState}</span>
              </div>
              <div class="header-meta">
                <span class="id-tag">ID: ${this.corridorAnalysis.id}</span>
                <span class="region-tag">${this.corridorAnalysis.region}</span>
                <span class="risk-badge ${this.corridorAnalysis.riskClass.toLowerCase()}">${this.corridorAnalysis.riskClass}</span>
              </div>
            </div>

            <div class="analysis-body">
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">SCORE</span>
                  <span class="value highlight">${this.corridorAnalysis.score}</span>
                </div>
                <div class="stat-item">
                  <span class="label">VELOCITY</span>
                  <span class="value">${this.corridorAnalysis.velocity}</span>
                </div>
                <div class="stat-item">
                  <span class="label">DISTANCE</span>
                  <span class="value">${this.corridorAnalysis.totalKm} km</span>
                </div>
                <div class="stat-item">
                  <span class="label">MODE</span>
                  <span class="value">${this.corridorAnalysis.mode}</span>
                </div>
              </div>

              <div class="souls-section">
                <div class="section-title">INTELLIGENCE ENGINES (SCORE DECOMPOSITION)</div>
                <div class="souls-grid">
                  <div class="soul-item health">
                    <span class="soul-label">PATH PLAUSIBILITY</span>
                    <div class="soul-bar"><div class="fill" style="width: ${this.corridorAnalysis.scoreDecomposition.path * 100}%"></div></div>
                    <span class="soul-val">${this.corridorAnalysis.scoreDecomposition.path.toFixed(2)}</span>
                  </div>
                  <div class="soul-item displacement">
                    <span class="soul-label">LOCATION SHARPENING</span>
                    <div class="soul-bar"><div class="fill" style="width: ${this.corridorAnalysis.scoreDecomposition.location * 100}%"></div></div>
                    <span class="soul-val">${this.corridorAnalysis.scoreDecomposition.location.toFixed(2)}</span>
                  </div>
                  <div class="soul-item conflict">
                    <span class="soul-label">ANOMALY DETECTION</span>
                    <div class="soul-bar"><div class="fill" style="width: ${this.corridorAnalysis.scoreDecomposition.anomaly * 100}%"></div></div>
                    <span class="soul-val">${this.corridorAnalysis.scoreDecomposition.anomaly.toFixed(2)}</span>
                  </div>
                  <div class="soul-item forecast">
                    <span class="soul-label">FORECAST DRIFT</span>
                    <div class="soul-bar"><div class="fill" style="width: ${this.corridorAnalysis.scoreDecomposition.forecast * 100}%"></div></div>
                    <span class="soul-val">${this.corridorAnalysis.scoreDecomposition.forecast.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              ${this.corridorAnalysis.forecast ? html`
                <div class="forecast-section">
                  <div class="section-title">FORECAST & DRIFT</div>
                  <div class="forecast-content">
                    <div class="forecast-stat">
                      <span class="label">NEXT ACTIVATION</span>
                      <span class="value">${(this.corridorAnalysis.forecast.nextActivationLikelihood * 100).toFixed(0)}%</span>
                    </div>
                    <div class="forecast-stat">
                      <span class="label">DRIFT DIRECTION</span>
                      <span class="value">${this.corridorAnalysis.forecast.driftDirectionDeg}°</span>
                    </div>
                  </div>
                </div>
              ` : ''}

              <div class="nodes-section">
                <div class="section-title">CORRIDOR NODES</div>
                <div class="nodes-list">
                  ${this.corridorAnalysis.nodes.map(node => html`
                    <div class="node-item">
                      <div class="node-main">
                        <span class="node-name">${node.name}</span>
                        <span class="node-type">${node.type}</span>
                      </div>
                      <div class="node-meta">
                        <span class="node-risk ${node.risk.toLowerCase()}">${node.risk}</span>
                        <span class="node-pop">Pop: ${node.pop.toLocaleString()}</span>
                      </div>
                    </div>
                  `)}
                </div>
              </div>

              <div class="evidence-section">
                <div class="section-title">EVIDENCE PROVENANCE</div>
                <div class="evidence-list">
                  ${this.corridorAnalysis.evidence.map(ev => html`
                    <div class="evidence-item">
                      <div class="ev-header">
                        <span class="ev-source">${ev.source}</span>
                        <span class="ev-type">${ev.type}</span>
                      </div>
                      <div class="ev-meta">
                        <span>Truth: ${ev.truthScore}</span> · 
                        <span>Conf: ${ev.locationConfidence}</span>
                      </div>
                      <div class="ev-time">${new Date(ev.timestamp).toLocaleDateString()}</div>
                    </div>
                  `)}
                </div>
              </div>

              <div class="inference-section">
                <div class="section-title">INFERENCE TRACE</div>
                <div class="inference-text">${this.corridorAnalysis.inference}</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${this.signalData ? html`
          <div class="signal-status-bar">
            <span class="signal-source">${this.signalData.source}</span>
            <span class="signal-count">${this.signalData.count.toLocaleString()} signals ingested</span>
            <span class="signal-status">${this.signalData.status}</span>
          </div>
        ` : ''}

        ${this.selectedElement ? html`
          <div class="selection-inspector">
            <div class="inspector-header">
              <span class="inspector-type">${this.selectedElement.type}</span>
              <button class="close-inspector" @click="${() => this.selectedElement = null}">×</button>
            </div>
            <div class="inspector-title">${this.selectedElement.title}</div>
            <div class="inspector-details">
              ${this.selectedElement.details.map((d: any) => html`
                <div class="detail-item">
                  <span class="detail-label">${d.label}</span>
                  <span class="detail-value">${d.value}</span>
                </div>
              `)}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="sidebar" role="complementary" aria-labelledby="chat-heading">
        <div class="selector" role="tablist" aria-label="Chat providers">
          <button
            id="geminiTab"
            role="tab"
            aria-selected=${this.selectedChatTab === ChatTab.GEMINI}
            aria-controls="chat-panel"
            class=${classMap({
              'selected-tab': this.selectedChatTab === ChatTab.GEMINI,
            })}
            @click=${() => {
              this.selectedChatTab = ChatTab.GEMINI;
            }}>
            <span id="chat-heading">Phantom POE</span>
            ${this.lane ? html`
              <span style="padding: 2px 10px; border: 1px solid ${this.lane.badge_color}40; color: ${this.lane.badge_color}; font-size: 7px; letter-spacing: 1.5px; margin-left: 8px; border-radius: 4px; text-transform: uppercase;">
                ${this.lane.mode}
              </span>
            ` : ''}
          </button>
          <button
            id="briefTab"
            role="tab"
            aria-selected=${this.selectedChatTab === ChatTab.BRIEF}
            aria-controls="brief-panel"
            class=${classMap({
              'selected-tab': this.selectedChatTab === ChatTab.BRIEF,
            })}
            @click=${() => {
              this.selectedChatTab = ChatTab.BRIEF;
            }}>
            <span>Brief</span>
            ${this.pendingDetections.length > 0 ? html`
              <span style="background: #ff4444; color: white; font-size: 10px; font-weight: bold; border-radius: 50%; padding: 2px 6px; margin-left: 6px;">
                ${this.pendingDetections.length}
              </span>
            ` : ''}
          </button>
          <button
            class="sidebar-toggle"
            @click=${() => {
              this.sidebarCollapsed = !this.sidebarCollapsed;
            }}
            aria-label=${this.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            ${this.sidebarCollapsed ? html`
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
            ` : html`
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m296-345-56-56 240-240 240 240-56 56-184-184-184 184Z"/></svg>
            `}
          </button>
        </div>
        <div
          id="chat-panel"
          role="tabpanel"
          aria-labelledby="geminiTab"
          class=${classMap({
            'tabcontent': true,
            'showtab': this.selectedChatTab === ChatTab.GEMINI,
          })}>
          <div class="chat-messages" aria-live="polite" aria-atomic="false">
            ${this.messages}
            <div id="anchor"></div>
          </div>
          <div class="footer">
            <div
              id="chatStatus"
              aria-live="assertive"
              class=${classMap({'hidden': this.chatState === ChatState.IDLE})}>
              ${this.chatState === ChatState.GENERATING
                ? html`${ICON_BUSY} Generating...`
                : html``}
              ${this.chatState === ChatState.THINKING
                ? html`${ICON_BUSY} Thinking...`
                : html``}
              ${this.chatState === ChatState.EXECUTING
                ? html`${ICON_BUSY} Executing...`
                : html``}
            </div>
            <div
              id="inputArea"
              role="form"
              aria-labelledby="message-input-label">
              <div class="input-controls">
                <label class="thinking-toggle">
                  <input type="checkbox" .checked="${this.isThinkingMode}" @change="${(e: any) => this.isThinkingMode = e.target.checked}">
                  <span>Thinking Mode</span>
                </label>
                <button 
                  class="mic-button ${this.isRecording ? 'recording' : ''}" 
                  @click="${this.toggleRecording}"
                  title="${this.isRecording ? 'Stop Recording' : 'Start Recording'}"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                </button>
              </div>
              <label id="message-input-label" class="hidden"
                >Type your message</label
              >
              <input
                type="text"
                id="messageInput"
                .value=${this.inputMessage}
                @input=${(e: InputEvent) => {
                  this.inputMessage = (e.target as HTMLInputElement).value;
                }}
                @keydown=${(e: KeyboardEvent) => {
                  this.inputKeyDownAction(e);
                }}
                placeholder="Type your message or use mic..."
                autocomplete="off"
                aria-labelledby="message-input-label"
                aria-describedby="sendButton-desc" />
              <button
                id="sendButton"
                @click=${() => {
                  this.sendMessageAction();
                }}
                aria-label="Send message"
                aria-describedby="sendButton-desc"
                ?disabled=${this.chatState !== ChatState.IDLE}
                class=${classMap({
                  'disabled': this.chatState !== ChatState.IDLE,
                })}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="30px"
                  viewBox="0 -960 960 960"
                  width="30px"
                  fill="currentColor"
                  aria-hidden="true">
                  <path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z" />
                </svg>
              </button>
              <p id="sendButton-desc" class="hidden"
                >Sends the typed message to the AI.</p
              >
            </div>
          </div>
        </div>
        <div
          id="brief-panel"
          role="tabpanel"
          aria-labelledby="briefTab"
          class=${classMap({
            'tabcontent': true,
            'showtab': this.selectedChatTab === ChatTab.BRIEF,
          })}
          style="padding: 20px; overflow-y: auto; color: var(--text-primary); font-family: var(--font-sans);">
          <h2 style="font-size: 1.5rem; margin-bottom: 16px; font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.05em;">Intelligence Brief</h2>
          
          ${this.latestRun ? html`
            <div style="background: var(--surface-color); padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--accent-color);">
              <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-color); margin-bottom: 8px;">Latest Run Status</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 1.2rem; font-weight: bold; color: ${this.latestRun.status === 'completed' ? '#00E87A' : this.latestRun.status === 'failed' ? '#FF453A' : '#F5A623'}; text-transform: uppercase;">
                    ${this.latestRun.status}
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                    ${this.latestRun.signals_ingested} signals ingested · ${this.latestRun.corridors_detected} corridors detected
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          ${this.pendingDetections.length > 0 ? html`
            <div style="background: #ff444411; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff4444;">
              <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #ff4444; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>Pending Detections (${this.pendingDetections.length})</span>
                <button @click=${async () => {
                  for (const d of this.pendingDetections) {
                    await fetch(`/api/detections/${d.id}/ack`, { method: 'PUT' });
                  }
                  this.pendingDetections = [];
                }} style="background: transparent; border: 1px solid #ff4444; color: #ff4444; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; text-transform: uppercase;">Ack All</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${this.pendingDetections.map(d => html`
                  <div style="font-size: 0.85rem;">
                    <strong style="color: var(--text-primary);">${d.route_name}</strong>: ${d.summary}
                  </div>
                `)}
              </div>
            </div>
          ` : ''}

          <div style="background: var(--surface-2); padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--accent-primary);">
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 8px;">Key Finding</div>
            <div style="font-size: 2rem; font-weight: 600; color: var(--accent-primary); margin-bottom: 8px;">94.3%</div>
            <div style="font-size: 0.9rem; line-height: 1.5;">Informal divergence stat. This means 94.3% of cross-border movement in monitored regions bypasses formal Points of Entry (POEs).</div>
          </div>
          
          <h3 style="font-size: 1rem; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary);">Active Corridors (${this.corridors.length})</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${this.corridors.map(c => html`
              <div style="background: var(--surface-1); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer;" @click=${() => this.handleMapQuery({ location: c.id, origin: c.start_node, destination: c.end_node })}>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-family: var(--font-mono); font-size: 0.8rem;">${c.id}</span>
                  <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: ${c.risk_class === 'CRITICAL' ? '#ff444433' : '#44ff4433'}; color: ${c.risk_class === 'CRITICAL' ? '#ff4444' : '#44ff44'};">${c.risk_class}</span>
                </div>
                <div style="font-size: 0.9rem; margin-bottom: 4px;">${c.start_node} → ${c.end_node}</div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
                  <span>Score: ${c.score.toFixed(2)}</span>
                  <span>Mode: ${c.inferred_mode}</span>
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    </div>`;
  }
}
