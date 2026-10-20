function t(t,e,i,r){var s,n=arguments.length,o=n<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,i,r);else for(var a=t.length-1;a>=0;a--)(s=t[a])&&(o=(n<3?s(o):n>3?s(e,i,o):s(e,i))||o);return n>3&&o&&Object.defineProperty(e,i,o),o}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),s=new WeakMap;let n=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=s.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(e,t))}return t}toString(){return this.cssText}};const o=t=>new n("string"==typeof t?t:t+"",void 0,r),a=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,r)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[r+1],t[0]);return new n(i,t,r)},l=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return o(e)})(t):t,{is:h,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:g}=Object,_=globalThis,v=_.trustedTypes,m=v?v.emptyScript:"",y=_.reactiveElementPolyfillSupport,b=(t,e)=>t,f={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},x=(t,e)=>!h(t,e),w={attribute:!0,type:String,converter:f,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=w){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(t,i,e);void 0!==r&&d(this.prototype,t,r)}}static getPropertyDescriptor(t,e,i){const{get:r,set:s}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:r,set(e){const n=r?.call(this);s?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??w}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...p(t),...u(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,r)=>{if(i)t.adoptedStyleSheets=r.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of r){const r=document.createElement("style"),s=e.litNonce;void 0!==s&&r.setAttribute("nonce",s),r.textContent=i.cssText,t.appendChild(r)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),r=this.constructor._$Eu(t,i);if(void 0!==r&&!0===i.reflect){const s=(void 0!==i.converter?.toAttribute?i.converter:f).toAttribute(e,i.type);this._$Em=t,null==s?this.removeAttribute(r):this.setAttribute(r,s),this._$Em=null}}_$AK(t,e){const i=this.constructor,r=i._$Eh.get(t);if(void 0!==r&&this._$Em!==r){const t=i.getPropertyOptions(r),s="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:f;this._$Em=r;const n=s.fromAttribute(e,t.type);this[r]=n??this._$Ej?.get(r)??n,this._$Em=null}}requestUpdate(t,e,i,r=!1,s){if(void 0!==t){const n=this.constructor;if(!1===r&&(s=this[t]),i??=n.getPropertyOptions(t),!((i.hasChanged??x)(s,e)||i.useDefault&&i.reflect&&s===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:r,wrapped:s},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==s||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===r&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,r=this[e];!0!==t||this._$AL.has(e)||void 0===r||this.C(e,void 0,i,r)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,y?.({ReactiveElement:$}),(_.reactiveElementVersions??=[]).push("2.1.2");const I=globalThis,k=t=>t,S=I.trustedTypes,E=S?S.createPolicy("lit-html",{createHTML:t=>t}):void 0,P="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,A="?"+C,T=`<${A}>`,M=document,L=()=>M.createComment(""),D=t=>null===t||"object"!=typeof t&&"function"!=typeof t,R=Array.isArray,O="[ \t\n\f\r]",F=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,G=/-->/g,U=/>/g,z=RegExp(`>|${O}(?:([^\\s"'>=/]+)(${O}*=${O}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),N=/'/g,H=/"/g,B=/^(?:script|style|textarea|title)$/i,j=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),q=j(1),V=j(2),K=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),X=new WeakMap,Y=M.createTreeWalker(M,129);function J(t,e){if(!R(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(e):e}class Z{constructor({strings:t,_$litType$:e},i){let r;this.parts=[];let s=0,n=0;const o=t.length-1,a=this.parts,[l,h]=((t,e)=>{const i=t.length-1,r=[];let s,n=2===e?"<svg>":3===e?"<math>":"",o=F;for(let e=0;e<i;e++){const i=t[e];let a,l,h=-1,d=0;for(;d<i.length&&(o.lastIndex=d,l=o.exec(i),null!==l);)d=o.lastIndex,o===F?"!--"===l[1]?o=G:void 0!==l[1]?o=U:void 0!==l[2]?(B.test(l[2])&&(s=RegExp("</"+l[2],"g")),o=z):void 0!==l[3]&&(o=z):o===z?">"===l[0]?(o=s??F,h=-1):void 0===l[1]?h=-2:(h=o.lastIndex-l[2].length,a=l[1],o=void 0===l[3]?z:'"'===l[3]?H:N):o===H||o===N?o=z:o===G||o===U?o=F:(o=z,s=void 0);const c=o===z&&t[e+1].startsWith("/>")?" ":"";n+=o===F?i+T:h>=0?(r.push(a),i.slice(0,h)+P+i.slice(h)+C+c):i+C+(-2===h?e:c)}return[J(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),r]})(t,e);if(this.el=Z.createElement(l,i),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(r=Y.nextNode())&&a.length<o;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(P)){const e=h[n++],i=r.getAttribute(t).split(C),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:s,name:o[2],strings:i,ctor:"."===o[1]?rt:"?"===o[1]?st:"@"===o[1]?nt:it}),r.removeAttribute(t)}else t.startsWith(C)&&(a.push({type:6,index:s}),r.removeAttribute(t));if(B.test(r.tagName)){const t=r.textContent.split(C),e=t.length-1;if(e>0){r.textContent=S?S.emptyScript:"";for(let i=0;i<e;i++)r.append(t[i],L()),Y.nextNode(),a.push({type:2,index:++s});r.append(t[e],L())}}}else if(8===r.nodeType)if(r.data===A)a.push({type:2,index:s});else{let t=-1;for(;-1!==(t=r.data.indexOf(C,t+1));)a.push({type:7,index:s}),t+=C.length-1}s++}}static createElement(t,e){const i=M.createElement("template");return i.innerHTML=t,i}}function Q(t,e,i=t,r){if(e===K)return e;let s=void 0!==r?i._$Co?.[r]:i._$Cl;const n=D(e)?void 0:e._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(t),s._$AT(t,i,r)),void 0!==r?(i._$Co??=[])[r]=s:i._$Cl=s),void 0!==s&&(e=Q(t,s._$AS(t,e.values),s,r)),e}class tt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,r=(t?.creationScope??M).importNode(e,!0);Y.currentNode=r;let s=Y.nextNode(),n=0,o=0,a=i[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new et(s,s.nextSibling,this,t):1===a.type?e=new a.ctor(s,a.name,a.strings,this,t):6===a.type&&(e=new ot(s,this,t)),this._$AV.push(e),a=i[++o]}n!==a?.index&&(s=Y.nextNode(),n++)}return Y.currentNode=M,r}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class et{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,r){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),D(t)?t===W||null==t||""===t?(this._$AH!==W&&this._$AR(),this._$AH=W):t!==this._$AH&&t!==K&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>R(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==W&&D(this._$AH)?this._$AA.nextSibling.data=t:this.T(M.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,r="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Z.createElement(J(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===r)this._$AH.p(e);else{const t=new tt(r,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=X.get(t.strings);return void 0===e&&X.set(t.strings,e=new Z(t)),e}k(t){R(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,r=0;for(const s of t)r===e.length?e.push(i=new et(this.O(L()),this.O(L()),this,this.options)):i=e[r],i._$AI(s),r++;r<e.length&&(this._$AR(i&&i._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=k(t).nextSibling;k(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class it{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,r,s){this.type=1,this._$AH=W,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=s,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=W}_$AI(t,e=this,i,r){const s=this.strings;let n=!1;if(void 0===s)t=Q(this,t,e,0),n=!D(t)||t!==this._$AH&&t!==K,n&&(this._$AH=t);else{const r=t;let o,a;for(t=s[0],o=0;o<s.length-1;o++)a=Q(this,r[i+o],e,o),a===K&&(a=this._$AH[o]),n||=!D(a)||a!==this._$AH[o],a===W?t=W:t!==W&&(t+=(a??"")+s[o+1]),this._$AH[o]=a}n&&!r&&this.j(t)}j(t){t===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class rt extends it{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===W?void 0:t}}class st extends it{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==W)}}class nt extends it{constructor(t,e,i,r,s){super(t,e,i,r,s),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??W)===K)return;const i=this._$AH,r=t===W&&i!==W||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,s=t!==W&&(i===W||r);r&&this.element.removeEventListener(this.name,this,i),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const at={I:et},lt=I.litHtmlPolyfillSupport;lt?.(Z,et),(I.litHtmlVersions??=[]).push("3.3.2");const ht=globalThis;let dt=class extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const r=i?.renderBefore??e;let s=r._$litPart$;if(void 0===s){const t=i?.renderBefore??null;r._$litPart$=s=new et(e.insertBefore(L(),t),t,void 0,i??{})}return s._$AI(t),s})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}};dt._$litElement$=!0,dt.finalized=!0,ht.litElementHydrateSupport?.({LitElement:dt});const ct=ht.litElementPolyfillSupport;ct?.({LitElement:dt}),(ht.litElementVersions??=[]).push("4.2.2");const pt={attribute:!0,type:String,converter:f,reflect:!1,hasChanged:x},ut=(t=pt,e,i)=>{const{kind:r,metadata:s}=i;let n=globalThis.litPropertyMetadata.get(s);if(void 0===n&&globalThis.litPropertyMetadata.set(s,n=new Map),"setter"===r&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===r){const{name:r}=i;return{set(i){const s=e.get.call(this);e.set.call(this,i),this.requestUpdate(r,s,t,!0,i)},init(e){return void 0!==e&&this.C(r,void 0,t,e),e}}}if("setter"===r){const{name:r}=i;return function(i){const s=this[r];e.call(this,i),this.requestUpdate(r,s,t,!0,i)}}throw Error("Unsupported decorator location: "+r)};function gt(t){return(e,i)=>"object"==typeof i?ut(t,e,i):((t,e,i)=>{const r=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),r?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function _t(t){return gt({...t,state:!0,attribute:!1})}const vt={invitation:{example:"Example shape",drag:"Drag this circle",dragPoint:"Drag this point",dismiss:"Dismiss example",replay:"Replay example shape",together:"Try the lights together",touchAdd:"Double-tap the shape to add a point",mouseAdd:"Double-click the shape to add a point",keyboardAdd:"Press Enter on a point to add another",description:"Example shape. Changing a point keeps this shape as an unsaved edit. Undo restores your previous shape.",values:"Example brightness values",forLight:t=>`Example shape for ${t}`,announcement:t=>`Example shape for ${t}. Use arrow keys on a point to edit. Undo restores your previous shape.`},scrubber:{title:"Room brightness",sliderAria:"Try group brightness",watchButton:"Watch room react",watchingPrefix:"Watching",watchingRestore:"Restore lights",heldStatus:"Trying unsaved changes",heldStatusSave:"Save keeps the shapes and restores the lights."},footer:{save:"Save",saving:"Saving…"},coach:{help:"Brightness tips",dismiss:"Dismiss tip",chooseTitle:"Dim a bright light",chooseBody:"Select the light, then choose Dim.",readyTitle:"Ready to save",readyBody:"Save now, or try “Watch room react” first.",savedTitle:"Shape saved",savedBody:"Adjust group brightness in Home Assistant."},presets:{panelAria:"Shapes for selected light",title:"Shapes",emptyTitle:"Select a light.",emptyBody:"Shapes apply to one light at a time.",forLight:t=>`Shapes for ${t}`,explanation:"Choose a shape, then adjust it on the graph.",trying:t=>`Trying ${t}`,chooseForLight:t=>`Choose it to shape ${t}.`,defs:{linear:{name:"Equal brightness",description:"Matches the group brightness."},dim_accent:{name:"Dim accent",description:"Rises gently, capped near 45%."},early_starter:{name:"Early starter",description:"Brightens early, then eases towards full brightness."},late_starter:{name:"Late starter",description:"Stays off through 60%, then rises gradually."}},chipLabels:{linear:"Equal",dim_accent:"Dim",early_starter:"Early",late_starter:"Late"}},legend:{off:"Off",title:"Lights",emptyCount:"No lights yet",countAllVisible:t=>`${t} ${1===t?"light":"lights"} showing`,countWithHidden:(t,e)=>`${t} ${1===t?"light":"lights"} · ${e} hidden`,listAria:t=>0===t?"No lights in this group":`${t} ${1===t?"light":"lights"} in this group`},graph:{yAxisLabel:"Per-light brightness"},card:{railAria:"Room lights and shapes",loading:"Loading brightness shapes…"},membership:{title:"Edit lights",subtitle:"Choose which lights this group controls. Existing shapes stay exactly as they are.",close:"Close",search:"Search lights",searchPlaceholder:"Search name or ID…",areaFilter:"Area",allAreas:"All areas",currentGroupOnly:t=>`Current group only (${t})`,showExceptional:t=>`Show hidden & disabled (${t})`,candidateList:"Lights available to this group",loading:"Loading lights…",sourceEmpty:"No lights are available to add.",filterEmpty:"No lights match these filters.",clearFilters:"Clear search and area",scopeEmpty:"No lights in this view.",showAllLights:"Show all lights",exceptionalEmpty:t=>`${t} hidden or disabled ${1===t?"light":"lights"}.`,showExceptionalAction:"Show hidden & disabled",hidden:"Hidden",disabled:"Disabled",missing:"Missing",unavailable:"Unavailable",lightCheckboxLabel:(t,e)=>0===e.length?t:`${t}, ${e.join(", ")}`,resultSummary:(t,e,i)=>{const r=`${t} ${1===t?"light":"lights"} shown`;return e===i?`${r} · ${i} selected`:`${r} · ${e} of ${i} selected shown`},selectedCount:t=>`${t} selected`,cancel:"Cancel",apply:"Update lights",applying:"Updating…",applyingStatus:"Updating group lights.",updated:"Lights updated.",tryAgain:"Try again",loadError:"Could not load lights.",applyError:"Could not update lights.",emptyError:"Select at least one light.",conflictError:"This group changed. Close and reopen Edit lights.",disabledError:"A selected light is disabled in Home Assistant. Enable the light in Home Assistant settings, then try again.",reloadError:"The group could not be reloaded. Your previous selection was restored.",rollbackError:"The update failed and the group runtime may need attention. Open Integrations to retry."}},mt=[{id:"linear",...vt.presets.defs.linear,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}]},{id:"dim_accent",...vt.presets.defs.dim_accent,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:25,target:8},{lightener:50,target:20},{lightener:100,target:45}]},{id:"early_starter",...vt.presets.defs.early_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:3},{lightener:15,target:36},{lightener:25,target:55},{lightener:50,target:85},{lightener:65,target:93},{lightener:100,target:100}]},{id:"late_starter",...vt.presets.defs.late_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:0},{lightener:60,target:0},{lightener:70,target:10},{lightener:80,target:35},{lightener:90,target:65},{lightener:100,target:100}]}];function yt(t,e,i){const[r,s]=t,[n,o]=e;return r===s?n:n+(i-r)*(o-n)/(s-r)}function bt(t){const e=new Map;let i=null;e.set(0,0);for(const r of t)0!==r.lightener||0===r.target?e.set(r.lightener,r.target):i=r.target;if(null===i||e.has(1)||e.set(1,i),!e.has(100)){let t=-1,i=100;for(const[r,s]of e)0!==r&&r>t&&(t=r,i=s);e.set(100,i)}const r=[];for(const[t,i]of e)r.push({lightener:t,target:i});return r.sort((t,e)=>t.lightener-e.lightener),r}function ft(t,e){return function(t,e){if(0===t.length)return 0;const i=Math.max(0,Math.min(100,e));if(i<=t[0].lightener)return t[0].target;for(let e=1;e<t.length;e++){const r=t[e-1],s=t[e];if(i===s.lightener)return s.target;if(i<s.lightener)return yt([r.lightener,s.lightener],[r.target,s.target],i)}return t[t.length-1].target}(bt(t),e)}const xt=44,wt=12,$t=300,It=200,kt=356,St=248;function Et(t){return xt+t/100*$t}function Pt(t){return wt+(1-t/100)*It}function Ct(t,e,i){return Math.max(e,Math.min(i,t))}function At(t){const e=t.length;if(0===e)return{dx:[],tangents:[]};if(1===e)return{dx:[],tangents:[0]};const i=[],r=[],s=[];for(let n=0;n<e-1;n++)i.push(t[n+1].x-t[n].x),r.push(t[n+1].y-t[n].y),s.push(0===i[n]?0:r[n]/i[n]);const n=new Array(e).fill(0);if(2===e)return n[0]=s[0],n[1]=s[0],{dx:i,tangents:n};n[0]=s[0],n[e-1]=s[e-2];for(let t=1;t<e-1;t++)0===s[t-1]||0===s[t]||s[t-1]*s[t]<=0?n[t]=0:n[t]=(s[t-1]+s[t])/2;for(let t=0;t<e-1;t++){if(0===s[t]){n[t]=0,n[t+1]=0;continue}const e=n[t]/s[t],i=n[t+1]/s[t],r=e*e+i*i;if(r>9){const o=3/Math.sqrt(r);n[t]=o*e*s[t],n[t+1]=o*i*s[t]}}return{dx:i,tangents:n}}function Tt(t,e){return Math.max(0,Math.min(100,ft(t,e)))}function Mt(t,e){const i=bt(t).map(t=>({x:t.lightener,y:t.target}));return Math.max(0,Math.min(100,function(t,e){if(t.length<2)return 0;if(2===t.length){const[i,r]=t,s=r.x-i.x;if(0===s)return i.y;const n=(e-i.x)/s;return i.y+n*(r.y-i.y)}const{dx:i,tangents:r}=At(t);let s=0;for(let i=0;i<t.length-1;i++){if(e<=t[i+1].x){s=i;break}s=i}const n=i[s]||1,o=Ct((e-t[s].x)/n,0,1),a=n/3,l=1-o;return l*l*l*t[s].y+3*l*l*o*(t[s].y+r[s]*a)+3*l*o*o*(t[s+1].y-r[s+1]*a)+o*o*o*t[s+1].y}(i,e)))}const Lt=["#42a5f5","#ef5350","#5c6bc0","#ffa726","#ab47bc","#1565c0","#ec407a","#8d6e63","#ffca28","#7e57c2"];function Dt(t){if(t.length<2)return"";if(2===t.length)return`M${t[0].x},${t[0].y} L${t[1].x},${t[1].y}`;const{dx:e,tangents:i}=At(t);let r=`M${t[0].x},${t[0].y}`;for(let s=0;s<t.length-1;s++){const n=e[s]/3;r+=` C${t[s].x+n},${t[s].y+i[s]*n} ${t[s+1].x-n},${t[s+1].y-i[s+1]*n} ${t[s+1].x},${t[s+1].y}`}return r}function Rt(t){const e=bt(t).map(t=>({x:t.lightener,y:t.target}));if(e.length<2)return[];const{dx:i,tangents:r}=At(e);return e.slice(0,-1).map((t,s)=>{const n=e[s+1],o=i[s]/3;return{x0:t.x,x1:n.x,y:[t.y,t.y+r[s]*o,n.y-r[s+1]*o,n.y]}})}function Ot(t,e){if(!t.length)return 0;const i=t.find(t=>e<=t.x1)??t[t.length-1],r=Ct((e-i.x0)/(i.x1-i.x0||1),0,1),s=1-r,[n,o,a,l]=i.y;return Ct(s*s*s*n+3*s*s*r*o+3*s*r*r*a+r*r*r*l,0,100)}const Ft=["","8 4","4 4","12 4 4 4","2 4"],Gt=["circle","square","diamond","triangle","bar"];function Ut(t){return 1-Math.pow(1-t,3)}const zt="cubic-bezier(0.33, 1, 0.68, 1)",Nt=["settle","diagonal","ripple","draw_in"],Ht=Object.freeze({settle:!1,diagonal:!1,ripple:!1,draw_in:!1}),Bt=Object.freeze({orientation:660,cueFade:330,cuePause:1540,presetLead:440,slowFactor:4.4,pulse:1980,context:5500}),jt=500;const qt="(prefers-reduced-motion: reduce)";function Vt(){return window.matchMedia?.(qt).matches??!1}function Kt(t){const e=window.matchMedia?.(qt);if(!e)return()=>{};const i=e=>{e.matches&&t()};return e.addEventListener("change",i),()=>e.removeEventListener("change",i)}function Wt(t,e){return t[e]&&!Vt()}function Xt(t,e,i){const r=performance.now();let s=!0,n=0;const o=a=>{if(!s)return;const l=Math.max(0,a-r);if(l>=t)return s=!1,void i?.();e(l),s&&(n=requestAnimationFrame(o))};return n=requestAnimationFrame(o),()=>{s&&(s=!1,cancelAnimationFrame(n))}}function Yt(t,e){if(0===e||t<=0||t>=250)return 0;const i=-2*Math.sign(e);if(t<70)return i*Ut(t/70);return i*(1-Ut((t-70)/180))}const Jt=["diag","floor","ceil"],Zt={diag:(t,e)=>Math.abs(e-t),floor:(t,e)=>e,ceil:(t,e)=>100-e};function Qt(t,e,i,r){const s=r=>0===Zt[r](e,i)&&("diag"!==r||t>0);return{held:Jt.filter(t=>s(t)||r.includes(t)&&Zt[t](e,i)<2),landed:Jt.find(t=>s(t)&&!r.includes(t))??null}}function te(t){return{points:t,pieces:Rt([...t])}}function ee(t,e,i){return i>=1?e:t+(e-t)*i}function ie(t){return t.length?[...t.map(t=>t.x0),t[t.length-1].x1]:[]}function re(t,e){const i=(e-t.x0)/(t.x1-t.x0),[r,s,n,o]=t.y,a=ee(r,s,i),l=ee(s,n,i),h=ee(n,o,i),d=ee(a,l,i),c=ee(l,h,i),p=ee(d,c,i);return[{x0:t.x0,x1:e,y:[r,a,d,p]},{x0:e,x1:t.x1,y:[p,c,h,o]}]}function se(t,e){const i=[...new Set([...ie(t),...ie(e)])].sort((t,e)=>t-e),r=t=>{const e=[];for(const r of t){let t=r;for(const r of i){if(r<=t.x0||r>=t.x1)continue;const[i,s]=re(t,r);e.push(i),t=s}e.push(t)}return e};return[r(t),r(e)]}function ne(t,e,i){const r=(t.x1-t.x0)/3,s=[t.x0,t.x0+r,t.x1-r,t.x1];return{x0:t.x0,x1:t.x1,y:t.y.map((t,r)=>ee(t,e.y[r],i(s[r])))}}function oe(t,e){return t.points.find(t=>t.lightener===e)?.target??Ot(t.pieces,e)}function ae(t,e){const i=[...new Set([...t.points,...e.points].map(t=>t.lightener))].sort((t,e)=>t-e),[r,s]=se(t.pieces,e.pieces);return{xs:i,from:i.map(e=>oe(t,e)),to:i.map(t=>oe(e,t)),piecesFrom:r,piecesTo:s}}function le(t){const e=t.xs.length-1;return e>0?Math.min(20,140/e):0}function he(t){return 300+le(t)*(t.xs.length-1)}function de(t,e){const i=le(t),r=t.xs.map((t,r)=>Ut(Ct((e-r*i)/300,0,1))),s=e=>{const i=t.xs.findIndex(t=>t>=e);if(-1===i)return r[r.length-1];if(0===i)return r[0];const[s,n]=[t.xs[i-1],t.xs[i]];return r[i-1]+(r[i]-r[i-1])*(e-s)/(n-s)};return{points:t.xs.map((e,i)=>({lightener:e,target:ee(t.from[i],t.to[i],r[i])})),pieces:t.piecesFrom.map((e,i)=>ne(e,t.piecesTo[i],s))}}function ce(t,e){const i=new Map(e.points.map(t=>[t.lightener,t.target]));return t.map(t=>({lightener:t.lightener,target:i.get(t.lightener)??t.target}))}function pe(t,e,i){const[r,s]=se(t,e);return r.map((t,e)=>ne(t,s[e],()=>i))}const ue=Bt.orientation,ge=Bt.cuePause,_e=Bt.slowFactor,ve=new Set,me=t=>`lightener:first-use:v1:${t}`;function ye(t,e){ve.add(t);try{localStorage.setItem(me(t),e)}catch{}}function be(t){return t.length>0&&t.every(t=>t.controlPoints.length>=2&&t.controlPoints.every(t=>t.lightener===t.target))}class fe{constructor(t){this.changed=t,this.curve=null,this.moving=!1,this.cueAnimating=!1,this.showInstruction=!1,this.presetHighlighted=!1,this._cancelFrame=null,this._motionTimer=null,this._presetTimer=null,this._instructionTimer=null}start(t,e){this.clear();const i=mt.find(t=>"dim_accent"===t.id),r=ae(te(t.controlPoints),te(i.controlPoints)),s=e=>{const i=de(r,e).points.map(t=>({lightener:t.lightener,target:Math.round(t.target)}));this.curve={...t,controlPoints:i},this.changed()};this.showInstruction=!0;const n=e&&!Vt();this.cueAnimating=n,this.presetHighlighted=!n,s(n?0:he(r)),n?(this._presetTimer=setTimeout(()=>{this._presetTimer=null,this.presetHighlighted=!0,this.changed()},ge-Bt.presetLead),this._motionTimer=setTimeout(()=>{this._motionTimer=null,Vt()?this.freeze():(this.moving=!0,this.changed(),this._cancelFrame=Xt(Math.round(he(r)*_e),t=>{Vt()?this.freeze():s(t/_e)},()=>{this._cancelFrame=null,this.moving=!1,s(he(r)),this._fadeInstructionLater()}))},ge)):this._fadeInstructionLater()}_fadeInstructionLater(){this.showInstruction&&null===this._instructionTimer&&(this._instructionTimer=setTimeout(()=>{this._instructionTimer=null,this.showInstruction=!1,this.cueAnimating=!1,this.changed()},Bt.context))}freeze(){null!==this._presetTimer&&clearTimeout(this._presetTimer),this._presetTimer=null,this.presetHighlighted=!1,null!==this._motionTimer&&clearTimeout(this._motionTimer),this._motionTimer=null,this._cancelFrame?.(),this._cancelFrame=null,this.moving=!1,this.cueAnimating=!1,this._fadeInstructionLater(),this.changed()}clear(){null!==this._presetTimer&&clearTimeout(this._presetTimer),this._presetTimer=null,this.presetHighlighted=!1,null!==this._motionTimer&&clearTimeout(this._motionTimer),this._motionTimer=null,this._cancelFrame?.(),this._cancelFrame=null,null!==this._instructionTimer&&clearTimeout(this._instructionTimer),this._instructionTimer=null,this.curve=null,this.moving=!1,this.cueAnimating=!1,this.showInstruction=!1,this.changed()}}const xe="lightener_studio",we="lightener-curve-card",$e="custom:lightener-curve-card";function Ie(t,e){return"light"===e.split(".")[0]&&t.entities?.[e]?.platform===xe}function ke(t,e){customElements.get(t)||customElements.define(t,e)}class Se{constructor(t,e){this.isConnected=t,this.requestUpdate=e,this.ready=!1,this.started=!1}ensureLoaded(){if(this.started)return;if(this.started=!0,customElements.get("ha-entity-picker"))return void(this.ready=!0);(async()=>{try{const t=window.loadCardHelpers;"function"==typeof t&&await t()}catch{}try{const t=customElements.get("hui-entities-card");await(t?.getConfigElement?.())}catch{}})();const t=customElements.whenDefined("ha-entity-picker"),e=new Promise(t=>setTimeout(t,1500));Promise.race([t,e]).then(()=>{this.isConnected()&&(this.ready=!!customElements.get("ha-entity-picker"),this.ready||(console.warn("[lightener] <ha-entity-picker> not available — falling back to plain input."),customElements.whenDefined("ha-entity-picker").then(()=>{this.isConnected()&&(this.ready=!0,this.requestUpdate())}).catch(()=>{})),this.requestUpdate())}).catch(()=>{})}}function Ee(t,e,i){return Object.keys(t).map((r,s)=>{const n=t[r]?.brightness??{},o=new Map([[0,0]]);for(const[t,e]of Object.entries(n)){const i=Number(t),r=Number(e);Number.isFinite(i)&&Number.isFinite(r)&&(i<0||i>100||r<0||r>100||o.set(i,r))}const a=[...o].map(([t,e])=>({lightener:t,target:e}));a.sort((t,e)=>t.lightener-e.lightener);const l=e[r]?.attributes?.friendly_name??r.replace("light.","");return{entityId:r,friendlyName:l,controlPoints:a,visible:!0,color:i[s%i.length]}})}function Pe(t){return{...t,controlPoints:t.controlPoints.map(t=>({...t}))}}function Ce(t){return t.map(Pe)}function Ae(t,e){if(t.length!==e.length)return!1;for(let i=0;i<t.length;i++){const r=t[i].controlPoints,s=e[i].controlPoints;if(r.length!==s.length)return!1;for(let t=0;t<r.length;t++){if(r[t].lightener!==s[t].lightener)return!1;if(r[t].target!==s[t].target)return!1}}return!0}function Te(t,e){const i=t.find(t=>t.entityId===e);return!!i&&i.visible}function Me(t,e){!function(t,e){t.push(Ce(e)),t.length>50&&t.shift()}(t,e)}function Le(t,e,i){return function(t,e,i){const r=t[e];if(!r)return null;if(r.controlPoints.length<=2)return null;if(0===i)return null;if(!Number.isInteger(i)||i<0||i>=r.controlPoints.length)return null;const s=[...t],n={...s[e]};return n.controlPoints=n.controlPoints.filter((t,e)=>e!==i),s[e]=n,s}(t,e,i)}const De=.25;class Re{constructor(t,e=300){this._host=t,this._intervalMs=e,this._active=!1,this._rafPending=!1,this._trailingTimer=null,this._restoreBrightness=new Map,this._lastBrightness=new Map,this._frameGeneration=0,this._pending=null,this.lastPreviewTime=0}get active(){return this._active}start(){const t=this._host.getHass();if(t&&!this._active){if(this._active=!0,this._host.setPreviewActive(!0),null===this._host.getScrubberPosition()){this._host.setScrubberPosition(50);const t=this._host.getStorageEntityId();t&&this._host.persistScrubberPosition(t,50)}this._restoreBrightness.clear(),this._lastBrightness.clear();for(const e of this._host.getCurves()){if(!e.visible)continue;const i=t.states[e.entityId];i&&this._restoreBrightness.set(e.entityId,"off"===i.state?null:i.attributes.brightness??void 0)}this.refresh(!0)}}stop(){if(!this._active)return;this._active=!1,this._host.setPreviewActive(!1),this._rafPending=!1,this._frameGeneration++,this._clearTrailingTimer();const t=this._host.getHass();if(t)for(const[e,i]of this._restoreBrightness)null===i?t.callService("light","turn_off",{entity_id:e,transition:De}).catch(()=>{}):void 0===i?t.callService("light","turn_on",{entity_id:e,transition:De}).catch(()=>{}):t.callService("light","turn_on",{entity_id:e,brightness:i,transition:De}).catch(()=>{});this._restoreBrightness.clear(),this._lastBrightness.clear()}disconnect(){this.stop(),this._clearTrailingTimer(),this._rafPending=!1,this._pending=null,this._frameGeneration++}refresh(t=!1){this._active&&(null===this._host.getScrubberPosition()&&this._host.setScrubberPosition(50),this.previewLights(this._host.getScrubberPosition()??50,t))}previewLights(t,e=!1){this._schedule({position:t,entityId:null},e)}previewSingleLight(t,e,i=!1,r){this._schedule({position:e,entityId:t,value:r},i)}_schedule(t,e){const i=this._host.getHass();if(!this._active||!i)return;this._pending=t,e&&(this.lastPreviewTime=0,this._rafPending=!1,this._frameGeneration++,null===t.entityId?this._lastBrightness.clear():this._lastBrightness.delete(t.entityId),this._clearTrailingTimer());const r=Date.now()-this.lastPreviewTime;if(r<this._intervalMs)return void(this._trailingTimer||(this._trailingTimer=setTimeout(()=>{this._trailingTimer=null,null!==this._pending&&this._schedule(this._pending,!1)},this._intervalMs-r)));if(this._rafPending)return;this._clearTrailingTimer(),this._rafPending=!0;const s=this._frameGeneration;requestAnimationFrame(()=>{if(s!==this._frameGeneration)return;this._rafPending=!1;const e=this._host.getHass();if(!this._active||!e)return;this.lastPreviewTime=Date.now();const i=this._pending??t;if(null===i.entityId)for(const t of this._host.getCurves())t.visible&&this._pushCurve(e,t,i.position);else{const t=this._host.getCurves().find(t=>t.entityId===i.entityId);t&&t.visible&&this._pushCurve(e,t,i.position,i.value)}})}_pushCurve(t,e,i,r){this._ensureRestoreSnapshot(t,e.entityId);const s=Math.max(0,Math.min(100,r??Tt(e.controlPoints,i))),n=Math.round(s/100*255);if(0===n){if("off"===this._lastBrightness.get(e.entityId))return;this._lastBrightness.set(e.entityId,"off"),t.callService("light","turn_off",{entity_id:e.entityId,transition:De}).catch(()=>{})}else{if(this._lastBrightness.get(e.entityId)===n)return;this._lastBrightness.set(e.entityId,n),t.callService("light","turn_on",{entity_id:e.entityId,brightness:n,transition:De}).catch(()=>{})}}_ensureRestoreSnapshot(t,e){if(this._restoreBrightness.has(e))return;const i=t.states[e];i&&this._restoreBrightness.set(e,"off"===i.state?null:i.attributes.brightness??void 0)}_clearTrailingTimer(){this._trailingTimer&&(clearTimeout(this._trailingTimer),this._trailingTimer=null)}}const Oe=["dim_accent","late_starter","early_starter"];class Fe{constructor(t){this._host=t,this._phase="inactive",this._firstRun=!1,this._shimmerStarted=!1,this._shimmerActive=!1,this._shimmerTimer=null,this._target=null,this._onInteraction=t=>{t.isTrusted&&this.interrupt()},this._onVisibilityChange=()=>{"visible"!==document.visibilityState?this.stopShimmer():this.maybeStartShimmer()}}get phase(){return this._phase}configure(t,e){const i=this._firstRun;this._firstRun=t,e?(this.stopShimmer(),this._shimmerStarted=!1,this._setPhase(t?"choose_shape":"inactive")):t&&!i&&"inactive"===this._phase&&(this._setPhase("choose_shape"),this._shimmerStarted=!1,this.maybeStartShimmer())}connect(t){this._target!==t&&(this._target&&this.disconnect(),this._target=t,t.addEventListener("pointerdown",this._onInteraction,!0),t.addEventListener("keydown",this._onInteraction,!0),t.addEventListener("focusin",this._onInteraction,!0),document.addEventListener("visibilitychange",this._onVisibilityChange))}disconnect(){this.stopShimmer(),this._target&&(this._target.removeEventListener("pointerdown",this._onInteraction,!0),this._target.removeEventListener("keydown",this._onInteraction,!0),this._target.removeEventListener("focusin",this._onInteraction,!0),document.removeEventListener("visibilitychange",this._onVisibilityChange),this._target=null)}maybeStartShimmer(){if(!this._target||!this._firstRun||this._shimmerStarted||"choose_shape"!==this._phase||!this._host.isReady()||"visible"!==document.visibilityState||Vt())return;const t=Oe.map(t=>mt.find(e=>e.id===t)).filter(t=>void 0!==t);if(0===t.length)return;this._shimmerStarted=!0,this._shimmerActive=!0;let e=0;const i=()=>{if(this._shimmerActive){if(e>=t.length)return this._shimmerActive=!1,this._shimmerTimer=null,void this._host.clearTrial();this._host.setTrial(t[e++]),this._shimmerTimer=window.setTimeout(i,1350)}};i()}stopShimmer(){null!==this._shimmerTimer&&(window.clearTimeout(this._shimmerTimer),this._shimmerTimer=null),this._shimmerActive&&(this._shimmerActive=!1,this._host.clearTrial())}interrupt(){this._shimmerStarted=!0,this.stopShimmer()}toggle(t){"inactive"!==this._phase?this.dismiss():this._setPhase(t?"ready_to_save":"choose_shape")}dismiss(){this.stopShimmer(),this._setPhase("inactive")}afterEdit(){this.stopShimmer(),"inactive"!==this._phase&&this._setPhase("ready_to_save")}afterClean(){"ready_to_save"===this._phase&&this._setPhase("choose_shape")}afterSave(){"ready_to_save"===this._phase&&(this.stopShimmer(),this._setPhase("complete"))}_setPhase(t){this._phase!==t&&(this._phase=t,this._host.requestUpdate())}}function Ge(t){return`${t} light${1===t?"":"s"}`}function Ue(t){return[...t].sort((t,e)=>t.lightener-e.lightener).map(t=>`${t.lightener}:${t.target}`).join("|")}function ze(t,e){if(!t.length)return null;const i=t.filter(t=>t.visible),r=t.length;if(!i.length)return{primary:"All lights are hidden",secondary:"Show a light in the list to bring its shape back.",visibleCount:0,totalCount:r,shapeCount:0,largestShapeCount:0};const s=function(t){const e=new Map;for(const i of t){const t=Ue(i.controlPoints),r=e.get(t)??[];r.push(i),e.set(t,r)}return e}(i),n=function(t){let e=[];for(const i of t.values())i.length>e.length&&(e=i);return e}(s),o=s.size,a=r-i.length,l=a>0?` ${a} hidden light${1===a?"":"s"}.`:"";if(e){const t=i.find(t=>t.entityId===e);if(t){const e=s.get(Ue(t.controlPoints))??[t],a=Math.max(0,e.length-1);return{primary:`Shaping ${t.friendlyName}`,secondary:a>0?`${Ge(a)} still share${1===a?"s":""} this shape.${l}`:`This light has its own shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:n.length}}}if(1===o&&i.length>1){return{primary:!!(h=n[0]?.controlPoints??[]).length&&h.every(t=>t.lightener===t.target)?`${Ge(i.length)} match the group brightness`:`${Ge(i.length)} share one brightness shape`,secondary:`Pick a light to give it its own shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:n.length}}var h;return o===i.length?{primary:`${Ge(i.length)}, ${o} separate shapes`,secondary:`Pick a light to focus its shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:n.length}:{primary:`${Ge(i.length)}, ${o} brightness shapes`,secondary:`${Ge(n.length)} share the most common shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:n.length}}const Ne=a`(max-width: ${o(500)}px)`,He=320,Be=Number(487.35483870967744.toFixed(2)),je=a`
  @property --curve-graph-max-height {
    syntax: '<length-percentage>';
    inherits: true;
    initial-value: ${He}px;
  }
  :host {
    --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
    --text-color: var(--primary-text-color, #212121);
    --secondary-text: var(--secondary-text-color, #616161);
    --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    --accent: var(--primary-color, #2563eb);
    --graph-bg: var(--card-background-color, var(--ha-card-background, #fafafa));
    --panel-bg: color-mix(in srgb, var(--card-bg) 95%, var(--secondary-text, #616161) 5%);
    --text-xs: 9px;
    --text-sm: 12px;
    --text-md: 13px;
    --text-lg: 14px;
    --curve-stack-default-max-width: ${Be}px;
    container: lightener-card-shell / inline-size;
    display: block;
    font-family: var(
      --mdc-typography-body1-font-family,
      var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)
    );
    height: fit-content;
  }
  .card {
    --_graph-panel-padding: 14px;
    /* Resolve the cap and padding together here: inherited computed custom
         properties would otherwise retain the wider padding in compact cards.
         The registered graph-height property preserves invalid-value fallback. */
    --curve-stack-max-width: calc(
      var(--curve-graph-max-height, ${He}px) * ${kt/St} + 2 *
        var(--_graph-panel-padding)
    );
    /* Layout keys on the card's own width, not the viewport, so the
         Lovelace card and the sidebar panel behave identically at the same
         size (the viewport-keyed embedded-only rules made them diverge). */
    container: lightener-card / inline-size;
    background: var(--card-bg);
    border-radius: var(--ha-card-border-radius, 16px);
    box-shadow: var(
      --ha-card-box-shadow,
      0 1px 3px rgba(0, 0, 0, 0.08),
      0 8px 24px rgba(0, 0, 0, 0.06)
    );
    padding: 20px;
    color: var(--text-color);
  }
  .card.embedded {
    box-shadow: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .workspace {
    display: grid;
    gap: 12px;
  }
  .editor-column {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .main-stack,
  .side-rail,
  .footer-slot,
  .status-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .main-stack {
    /* Cap the graph + scrubber stack at the graph's maximum rendered width
         (height cap x viewBox aspect ratio + panel padding) and center it as
         one unit. Past this width the SVG letterboxes inside a wider element
         while the scrubber keeps stretching, so slider positions stop
         corresponding to graph positions (DESIGN.md: track aligns with graph
         padding). The action footer spans the editor instead; its buttons
         commit the whole card, not only the graph column. */
    width: 100%;
    max-width: min(100%, var(--curve-stack-max-width));
    margin-inline: auto;
  }
  .footer-slot {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
  }
  .footer-slot.active {
    padding-top: 8px;
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: var(--card-bg);
    background: color-mix(in srgb, var(--card-bg) 72%, transparent);
    backdrop-filter: blur(14px);
  }
  .side-rail {
    gap: 10px;
  }
  .graph-panel {
    container: lightener-graph-panel / inline-size;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-radius: 12px;
    padding: var(--_graph-panel-padding);
    background: var(--panel-bg);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }
  .invitation-replay {
    margin-left: auto;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--secondary-text);
    font: inherit;
    font-size: 24px;
    cursor: pointer;
  }
  .invitation-replay:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .invitation-replay:focus-visible {
    outline: 2px solid var(--accent);
  }
  .first-use-experiment .invitation-insight {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 3px;
  }
  .first-use-experiment .invitation-insight .graph-insight-secondary {
    text-align: left;
    white-space: nowrap;
    animation: invitation-appear ${Bt.cueFade}ms ease-out both;
  }
  @keyframes invitation-appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .first-use-experiment .invitation-insight .graph-insight-secondary {
      animation: none;
    }
  }
  .first-use-experiment .shape-chip.invitation-chip {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .graph-workbench {
    display: grid;
    /* Leave room for the hint without changing rows when tips open. */
    grid-template-columns: minmax(0, 1fr) minmax(0, min(50%, 268px));
    align-items: start;
    gap: 10px;
    min-width: 0;
  }
  .graph-workbench .graph-insight-primary {
    max-width: 100%;
  }
  .graph-insight {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    color: var(--text-color);
    /* Reserve the band's height so summary/trial text swaps never move the
         graph below it. */
    min-height: 15px;
  }
  .graph-insight-primary {
    flex: 0 0 auto;
    max-width: 48%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.25;
  }
  /* The trial state must keep the resting state's one-line budget; letting
       it wrap grows the band and shoves the graph down on every hover. */
  .graph-insight-secondary {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--secondary-text);
    font-size: 11px;
    line-height: 1.25;
    text-align: right;
  }
  .shape-chip-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    align-self: start;
    justify-self: end;
    min-width: 0;
    width: min(100%, 268px);
    max-width: 100%;
  }
  /* Empty stand-in shown when no light is selected: reserves the same height
       and column footprint as the shape-chip row (see .shape-chip min-height)
       so the graph never shifts as the chip row appears and disappears. Kept as
       its own class — not .shape-chip-bar — so "is the chip bar present?" checks
       still mean the real, interactive chips. */
  .shape-chip-reserve {
    min-height: 40px;
    align-self: start;
    justify-self: end;
    width: min(100%, 268px);
  }
  .shape-chip {
    display: grid;
    grid-template-rows: 12px auto;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 40px;
    padding: 6px 6px 5px;
    border: 1px solid var(--divider);
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    font: inherit;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  }
  .shape-chip:hover {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 4%, transparent);
  }
  .shape-chip.active,
  .shape-chip.trial {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .shape-chip:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .shape-chip-spark {
    display: block;
    justify-self: stretch;
    width: 100%;
    height: 12px;
    opacity: 0.85;
  }
  .shape-chip-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    color: var(--text-color);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  .card.embedded .header {
    margin-bottom: 12px;
    padding-inline: 2px;
  }
  .card.embedded h2 {
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    color: var(--secondary-text);
  }
  .error {
    font-size: var(--text-sm);
    color: var(--error-color, #db4437);
    padding: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .error .retry-link {
    cursor: pointer;
    text-decoration: underline;
    opacity: 0.8;
    background: none;
    border: none;
    font: inherit;
    color: inherit;
    padding: 0;
  }
  .error .retry-link:hover {
    opacity: 1;
  }
  .success {
    font-size: var(--text-sm);
    color: var(--accent);
    padding: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: success-fade 2s ease forwards;
  }
  @keyframes success-fade {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .status-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  .loading-indicator {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 282px;
    gap: 10px;
    padding: 14px;
    border-radius: 12px;
    background: var(--panel-bg);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .loading-graph {
    position: relative;
    min-height: 242px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--divider) 72%, transparent);
    background:
      linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, var(--text-color) 8%, transparent),
        transparent
      ),
      linear-gradient(
        color-mix(in srgb, var(--secondary-text) 11%, transparent) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--secondary-text) 11%, transparent) 1px,
        transparent 1px
      ),
      var(--graph-bg);
    background-size:
      180px 100%,
      100% 25%,
      25% 100%,
      auto;
    background-position:
      -180px 0,
      0 0,
      0 0,
      0 0;
    animation: shimmer 1.8s ease-in-out infinite;
  }
  .loading-graph::before {
    content: '';
    position: absolute;
    inset: 18px 18px 18px 28px;
    border-left: 1px solid color-mix(in srgb, var(--secondary-text) 24%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--secondary-text) 24%, transparent);
    border-radius: 0 0 0 6px;
  }
  .loading-curve {
    position: absolute;
    left: 44px;
    right: 34px;
    height: 64px;
    border-radius: 999px;
    opacity: 0.48;
    transform-origin: bottom;
    clip-path: polygon(0% 78%, 18% 76%, 38% 48%, 60% 22%, 80% 28%, 100% 8%, 100% 100%, 0 100%);
    animation: loading-curve-rise 1.8s ease-in-out infinite;
  }
  .loading-curve.primary {
    bottom: 52px;
    background: linear-gradient(
      120deg,
      color-mix(in srgb, var(--accent) 10%, transparent),
      color-mix(in srgb, var(--accent) 42%, transparent) 45%,
      color-mix(in srgb, var(--accent) 14%, transparent)
    );
  }
  .loading-curve.warm {
    bottom: 36px;
    background: linear-gradient(
      120deg,
      color-mix(in srgb, #d97706 8%, transparent),
      color-mix(in srgb, #d97706 26%, transparent) 48%,
      color-mix(in srgb, #d97706 10%, transparent)
    );
    opacity: 0.36;
    transform: scaleY(0.74);
    animation-delay: 0.16s;
  }
  .loading-curve.cool {
    bottom: 78px;
    background: linear-gradient(
      120deg,
      color-mix(in srgb, #0f766e 8%, transparent),
      color-mix(in srgb, #0f766e 24%, transparent) 48%,
      color-mix(in srgb, #0f766e 10%, transparent)
    );
    opacity: 0.32;
    transform: scaleY(0.56);
    animation-delay: 0.28s;
  }
  .loading-point {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 64%, var(--graph-bg));
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 10%, transparent);
    opacity: 0.62;
    animation: loading-point-pulse 1.8s ease-in-out infinite;
  }
  .loading-point.one {
    left: 32%;
    bottom: 116px;
  }
  .loading-point.two {
    left: 58%;
    bottom: 148px;
    animation-delay: 0.14s;
  }
  .loading-point.three {
    left: 80%;
    bottom: 142px;
    animation-delay: 0.28s;
  }
  .loading-caption {
    font-size: var(--text-sm);
    color: var(--secondary-text);
    padding-inline: 2px;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes shimmer {
    0% {
      background-position:
        -180px 0,
        0 0,
        0 0,
        0 0;
    }
    100% {
      background-position:
        calc(100% + 180px) 0,
        0 0,
        0 0,
        0 0;
    }
  }
  @keyframes loading-curve-rise {
    0%,
    100% {
      opacity: 0.34;
    }
    50% {
      opacity: 0.58;
    }
  }
  @keyframes loading-point-pulse {
    0%,
    100% {
      opacity: 0.38;
      transform: scale(0.92);
    }
    50% {
      opacity: 0.72;
      transform: scale(1);
    }
  }
  /* Wide card: two columns with a full-width editor action bar. The footer
       sits in the graph column's next row while the side rail spans both rows;
       that keeps the action row under the graph without making its sticky range
       depend only on the short graph stack. Narrow card: stacked flow with the
       same sticky action bar so save/undo/cancel never sink below a long light
       list. Both are container queries on the card's own width — the Lovelace
       card and the sidebar panel get the same layout at the same size. Browsers
       without container-query support fall back to the stacked flow without
       stickiness. */
  @container lightener-card (min-width: 860px) {
    .workspace {
      grid-template-columns:
        minmax(0, min(52%, var(--curve-stack-max-width)))
        minmax(320px, 1fr);
      align-items: start;
      /* Footer visually spans both columns because save/cancel apply to the
           whole editor state, but its grid row stays paired with the graph so
           it does not land below a long side rail. */
      grid-template-areas:
        'editor side'
        'footer side';
    }
    .editor-column {
      grid-area: editor;
    }
    .side-rail {
      grid-area: side;
    }
    .footer-slot {
      grid-area: footer;
      position: sticky;
      bottom: max(0px, env(safe-area-inset-bottom));
      width: 100cqw;
      z-index: 3;
    }
  }
  .card.embedded .footer-slot.active[data-overlay] {
    position: fixed;
    left: var(--curve-footer-overlay-left, 0px);
    right: auto;
    bottom: max(0px, env(safe-area-inset-bottom));
    width: var(--curve-footer-overlay-width, 100vw);
    max-width: calc(100vw - var(--curve-footer-overlay-left, 0px));
    z-index: 10;
  }
  /* Browsers without container queries (older wall-tablet WebViews) never
       match the blocks above, which would revive the footer-below-the-list
       regression. Keep the reachability guarantee for them: stacked flow
       with the sticky footer under the graph at every width. The solid
       background line covers engines that also lack color-mix. */
  @supports not (container-type: inline-size) {
    .footer-slot {
      position: sticky;
      bottom: max(0px, env(safe-area-inset-bottom));
      z-index: 3;
    }
    .side-rail {
      order: 3;
    }
  }
  @container lightener-card (max-width: 859.98px) {
    .footer-slot {
      position: sticky;
      bottom: max(0px, env(safe-area-inset-bottom));
      z-index: 3;
    }
    .side-rail {
      order: 3;
    }
    .graph-insight {
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
      /* Stacked band: one primary line + a two-line secondary budget,
           reserved up front so text swaps never resize the band. */
      min-height: 46px;
    }
    .graph-insight-primary,
    .graph-insight-secondary {
      flex: none;
      max-width: 100%;
    }
    .graph-insight-secondary {
      text-align: left;
      white-space: normal;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }
  }
  /* Summary, trials and tips share a title-plus-two-lines budget. Reserve it
     before tips open, including on narrow cards with a separate chip row. */
  .graph-workbench .graph-insight,
  .coach-prompt {
    min-height: 46px;
  }
  .coach-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--primary-text-color, #212121);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.25;
  }
  .coach-copy {
    flex: 1;
    min-width: 0;
  }
  .coach-copy strong,
  .coach-copy span {
    display: block;
  }
  .coach-copy span {
    margin-top: 2px;
    color: var(--secondary-text-color, #616161);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.25;
  }
  .coach-help {
    position: relative;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    margin: -8px -8px -8px auto;
    border: 0;
    background: transparent;
    color: var(--secondary-text-color, #616161);
    font: 600 13px/1 sans-serif;
    cursor: pointer;
  }
  .coach-help::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid var(--divider-color, #ddd);
    border-radius: 50%;
  }
  .coach-help:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .coach-help:focus-visible,
  .coach-dismiss:focus-visible {
    outline: 2px solid var(--primary-color, #1590ad);
    outline-offset: 2px;
  }
  .coach-prompt::before {
    content: '';
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
    background: var(--primary-color, #1590ad);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color, #1590ad) 14%, transparent);
  }
  .coach-dismiss {
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    margin: -8px -8px -8px auto;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--secondary-text-color, #616161);
    font: 18px/1 sans-serif;
    cursor: pointer;
  }
  .coach-dismiss:hover {
    background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  }
  @container lightener-card (max-width: 559.98px) {
    .graph-workbench {
      grid-template-columns: 1fr;
    }
    .shape-chip-bar {
      min-width: 0;
      width: 100%;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @container lightener-card (min-width: 560px) {
    /* Use the empty chip column for the resting summary. The reserve stays
         in the same row so selecting a light does not move the graph. */
    .graph-workbench:has(.shape-chip-reserve) .graph-insight {
      grid-column: 1 / -1;
      grid-row: 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: 3px;
    }
    .graph-workbench:has(.shape-chip-reserve) .graph-insight-secondary {
      text-align: left;
    }
    .graph-workbench:has(.graph-insight) .shape-chip-reserve {
      grid-column: 1 / -1;
      grid-row: 1;
      pointer-events: none;
    }
  }
  @container lightener-card-shell ${Ne} {
    .card {
      --_graph-panel-padding: 12px;
      padding: 12px;
    }
    .header,
    .card.embedded .header {
      margin-bottom: 8px;
    }
    .workspace,
    .editor-column,
    .main-stack,
    .side-rail,
    .footer-slot,
    .status-stack,
    .graph-panel,
    .graph-workbench {
      gap: 8px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-graph,
    .loading-curve,
    .loading-point {
      animation: none;
    }
  }
`;const qe={phase:"idle"};class Ve{constructor(t,e=8e3,i=2e3){this._host=t,this._confirmTimeoutMs=e,this._successDisplayMs=i,this._confirmTimer=null,this._successTimer=null,this._generation=0,this._resolve=null}currentGeneration(){return this._generation}arm(){const t=++this._generation;this._clearConfirmTimer(),this._settle("error");const e=new Promise(e=>{this._resolve=e,this._confirmTimer=setTimeout(()=>{this._confirmTimer=null,this._generation===t&&"confirming"===this._host.getSavePhase()&&this._host.dispatchSave({type:"save-error",message:"Save confirmation timed out."})},this._confirmTimeoutMs)});return{generation:t,settled:e}}confirm(t){"confirming"===this._host.getSavePhase()&&t===this._generation&&(this._host.dispatchSave({type:"save-confirmed"}),this._clearSuccessTimer(),this._successTimer=setTimeout(()=>{this._successTimer=null,"saved"===this._host.getSavePhase()&&this._host.dispatchSave({type:"save-clear"})},this._successDisplayMs))}fail(t,e){"confirming"===this._host.getSavePhase()&&t===this._generation&&this._host.dispatchSave({type:"save-error",message:e})}onLeaveConfirming(t,e){this._clearConfirmTimer(),e&&this._settle("error"===t?"error":"confirmed")}settleError(){this._settle("error")}dispose(){this._clearSuccessTimer(),this._clearConfirmTimer(),this._settle("error")}_settle(t){const e=this._resolve;e&&(this._resolve=null,e(t))}_clearConfirmTimer(){this._confirmTimer&&(clearTimeout(this._confirmTimer),this._confirmTimer=null)}_clearSuccessTimer(){this._successTimer&&(clearTimeout(this._successTimer),this._successTimer=null)}}const Ke={loaded:!1,loading:!1,loadError:null};function We(t,e){const i={...t,loaded:!1};return i.loading?{state:{...i,reloadAfterLoadEntityId:e},runNow:!1}:{state:i,runNow:!0}}function Xe(t){return{...t,loaded:!1,loadedEntityId:void 0}}const Ye=2,Je=t=>(...e)=>({_$litDirective$:t,values:e});let Ze=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};const{I:Qe}=at,ti=t=>t,ei=()=>document.createComment(""),ii=(t,e,i)=>{const r=t._$AA.parentNode,s=void 0===e?t._$AB:e._$AA;if(void 0===i){const e=r.insertBefore(ei(),s),n=r.insertBefore(ei(),s);i=new Qe(e,n,t,t.options)}else{const e=i._$AB.nextSibling,n=i._$AM,o=n!==t;if(o){let e;i._$AQ?.(t),i._$AM=t,void 0!==i._$AP&&(e=t._$AU)!==n._$AU&&i._$AP(e)}if(e!==s||o){let t=i._$AA;for(;t!==e;){const e=ti(t).nextSibling;ti(r).insertBefore(t,s),t=e}}}return i},ri=(t,e,i=t)=>(t._$AI(e,i),t),si={},ni=(t,e=si)=>t._$AH=e,oi=t=>{t._$AR(),t._$AA.remove()},ai=Je(class extends Ze{constructor(){super(...arguments),this.key=W}render(t,e){return this.key=t,e}update(t,[e,i]){return e!==this.key&&(ni(t),this.key=e),i}});let li=0;const hi={diag:[0,100],floor:[0,0],ceil:[100,100]};class di extends dt{constructor(){super(),this.curves=[],this.selectedCurveId=null,this.entityId=null,this.readOnly=!1,this.scrubberPosition=null,this.previewCurve=null,this.exampleEntityId=null,this.exampleInstruction=null,this.exampleCueAnimating=!1,this.joy=Ht,this.curveFrame=null,this.drawIn=null,this._dragCurveIdx=-1,this._dragPointIdx=-1,this._hoveredPoint=null,this._focusedPoint=null,this._isMobile=!1,this._settle=null,this._flash=null,this._reveal=null,this._uid=(li++).toString(36),this._mql=null,this._wasDragging=!1,this._longPressTimer=null,this._longPressFired=!1,this._touchTapStart=null,this._lastTouchTap=null,this._suppressDblClickUntil=0,this._dragStartTarget=null,this._dragPointerId=null,this._dragInput="mouse",this._dragReleaseTimer=null,this._cancelSettleLoop=null,this._heldLines=[],this._flashToken=0,this._flashTimer=null,this._cancelDrawInLoop=null,this._drawInObserver=null,this._pendingDrawInToken=null,this._lastDrawInToken=-1,this._settlePoint=null,this._onDrawInIntersection=t=>{const e=t.find(t=>t.target===this);if(!e)return;const i=e.isIntersecting&&e.intersectionRatio>=.5,r=this._pendingDrawInToken;if(i&&null!==r&&this.drawIn?.token===r&&!1!==this.drawIn.ready)this._startDrawIn(r);else if(!i&&this._reveal&&null===r){const t=this._reveal.token;this._waitForDrawInVisibility(t),this.dispatchEvent(new CustomEvent("draw-in-waiting",{detail:{token:t},bubbles:!0,composed:!0}))}},this._onMqlChange=t=>{this._isMobile=t.matches};const t=()=>{this._stopSettle(),this._stopFlash()};this.addEventListener("pointerdown",t,!0),this.addEventListener("keydown",t,!0)}_interaction(t,e){this.dispatchEvent(new CustomEvent("graph-interaction",{detail:{phase:t,input:e},bubbles:!0,composed:!0}))}get interactionActive(){return null!==this._dragPointerId||null!==this._touchTapStart}focusPoint(t,e){const i=this.curves.findIndex(e=>e.entityId===t),r=this.curves[i]?.controlPoints.findIndex(t=>t.lightener===e)??-1,s=this.renderRoot.querySelector(`.hit-circle[data-curve="${i}"][data-point="${r}"]`);return!!s&&(s.focus({preventScroll:!0}),!0)}cancelInteraction(){const t=this._dragPointerId,e=this._touchTapStart?.pointerId;this._dragCurveIdx=-1,this._dragPointIdx=-1,this._dragPointerId=null,this._dragStartTarget=null,this._heldLines=[],this._clearLongPress(),this._longPressFired=!1,this._touchTapStart=null,this._lastTouchTap=null,this._suppressDblClickUntil=0,this._wasDragging=!1,null!==this._dragReleaseTimer&&clearTimeout(this._dragReleaseTimer),this._dragReleaseTimer=null,this._hoveredPoint=null,this._focusedPoint=null,this._stopSettle(),this._stopFlash();for(const i of[this._svgRef,...this.renderRoot.querySelectorAll("rect")])for(const r of[t,e])null!=r&&i?.hasPointerCapture?.(r)&&i.releasePointerCapture(r);this._interaction("cancel",this._dragInput)}_getSvgCoords(t){const e=this._svgRef;if(!e)return null;const i=e.getScreenCTM();if(!i)return null;let r;try{r=i.inverse()}catch{return null}if(!r||isNaN(r.a))return null;const s=e.createSVGPoint();s.x=t.clientX,s.y=t.clientY;const n=s.matrixTransform(r);return{x:(a=n.x,(a-xt)/$t*100),y:(o=n.y,100*(1-(o-wt)/It))};var o,a}_dispatchPointAddFromEvent(t){const e=this._getSvgCoords(t);if(!e)return!1;const i=Math.round(Ct(e.x,1,100)),r=Math.round(Ct(e.y,0,100));return this.dispatchEvent(new CustomEvent("point-add",{detail:{lightener:i,target:r,entityId:this.selectedCurveId},bubbles:!0,composed:!0})),!0}_isNonMousePointer(t){return""!==t.pointerType&&"mouse"!==t.pointerType}_touchMoveDistance(t,e){return Math.hypot(e.clientX-t.clientX,e.clientY-t.clientY)}_isCurveInteractive(t){return!this.readOnly&&(null===this.selectedCurveId||this.curves[t]?.entityId===this.selectedCurveId)}_focusCurve(t){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_onPointFocus(t,e){this._interaction("start","keyboard");const i=this.curves[t];i&&(this._focusedPoint={curve:t,point:e},this._hoveredPoint={curve:t,point:e},this._focusCurve(i.entityId))}_onPointBlur(t,e){this._focusedPoint?.curve===t&&this._focusedPoint?.point===e&&(this._focusedPoint=null),this._hoveredPoint?.curve===t&&this._hoveredPoint?.point===e&&(this._hoveredPoint=null)}_dispatchKeyboardMove(t,e,i,r){this.joy.diagonal&&t===this._dragCurveIdx&&e===this._dragPointIdx&&(this._heldLines=Qt(e,i,r,this._heldLines).held),this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:t,pointIndex:e,lightener:i,target:r},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:t,pointIndex:e},bubbles:!0,composed:!0}))}_getKeyboardInsertPoint(t,e){const i=t.controlPoints[e],r=t.controlPoints[e+1],s=t.controlPoints[e-1];return r&&r.lightener-i.lightener>1?{lightener:Math.round((i.lightener+r.lightener)/2),target:Math.round((i.target+r.target)/2)}:s&&i.lightener-s.lightener>1?{lightener:Math.round((s.lightener+i.lightener)/2),target:Math.round((s.target+i.target)/2)}:null}_onPointKeyDown(t,e,i){this._interaction("start","keyboard");const r=this.curves[e],s=r?.controlPoints[i];if(!r||!s)return;if(this.selectedCurveId!==r.entityId&&this._focusCurve(r.entityId),0===i&&("ArrowRight"===t.key||"ArrowLeft"===t.key))return;const n=t.shiftKey?10:1,o=i>0?r.controlPoints[i-1].lightener+1:s.lightener,a=i<r.controlPoints.length-1?r.controlPoints[i+1].lightener-1:100;if("ArrowRight"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.min(a,s.lightener+n),s.target);if("ArrowLeft"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.max(o,s.lightener-n),s.target);if("ArrowUp"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,s.lightener,Math.min(100,s.target+n));if("ArrowDown"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,s.lightener,Math.max(0,s.target-n));if("Enter"===t.key){const s=this._getKeyboardInsertPoint(r,i);if(!s)return;return t.preventDefault(),this.dispatchEvent(new CustomEvent("point-add",{detail:{entityId:r.entityId,lightener:s.lightener,target:s.target},bubbles:!0,composed:!0})),void this.updateComplete.then(()=>this._refocusHitCircle(e,i)).catch(()=>{})}(" "===t.key||"Delete"===t.key||"Backspace"===t.key)&&i>0&&r.controlPoints.length>2&&(t.preventDefault(),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})),this.updateComplete.then(()=>this._refocusHitCircle(e,Math.max(1,i-1))).catch(()=>{}))}_refocusHitCircle(t,e){const i=this.renderRoot.querySelector(`.hit-circle[data-curve="${t}"][data-point="${e}"]`);i&&i.focus()}_onPointerDown(t,e,i){0===t.button&&this._isCurveInteractive(e)&&(this._dragInput=t.pointerType||"mouse",this._interaction("start",this._dragInput),t.preventDefault(),this._longPressFired=!1,this._dragStartTarget=this.curves[e]?.controlPoints[i]?.target??null,this._dragPointerId=t.pointerId,this._heldLines=[],this._clearLongPress(),i>0&&(this._longPressTimer=setTimeout(()=>{this._longPressTimer=null,this._longPressFired=!0,this._dragCurveIdx=-1,this._dragPointIdx=-1,this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0}))},500)),this._svgRef?.setPointerCapture(t.pointerId),this._dragCurveIdx=e,this._dragPointIdx=i)}_clearLongPress(){this._longPressTimer&&(clearTimeout(this._longPressTimer),this._longPressTimer=null)}_onPointerMove(t){if(this._dragCurveIdx<0)return;t.preventDefault(),this._clearLongPress();const e=this._getSvgCoords(t);if(!e)return;const i=this.curves[this._dragCurveIdx],r=i?.controlPoints??[],s=this._dragPointIdx>0?r[this._dragPointIdx-1].lightener+1:1,n=this._dragPointIdx<r.length-1?r[this._dragPointIdx+1].lightener-1:100,o=0===this._dragPointIdx?this.curves[this._dragCurveIdx]?.controlPoints[0]?.lightener??0:Math.round(Ct(e.x,s,n)),a=Math.round(Ct(e.y,0,100));this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx,lightener:o,target:a},bubbles:!0,composed:!0})),this.joy.diagonal&&!this.readOnly&&this._noteDiagonalHit(o,a)}_onPointerUp(t){if(this._clearLongPress(),null===this._dragPointerId)return;t.preventDefault();const e=this._dragCurveIdx,i=this._dragPointIdx,r=this._dragStartTarget,s=e>=0&&!this._longPressFired,n="pointerup"===t.type&&t.pointerId===this._dragPointerId;s&&this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})),this._dragCurveIdx=-1,this._dragPointIdx=-1,this._dragPointerId=null,this._dragStartTarget=null,this._longPressFired=!1,this._wasDragging=!0,null!==this._dragReleaseTimer&&clearTimeout(this._dragReleaseTimer),this._dragReleaseTimer=setTimeout(()=>{this._wasDragging=!1,this._dragReleaseTimer=null},400),this._interaction(n?"end":"cancel",this._dragInput),n&&s&&this._startSettle(e,i,r)}_startSettle(t,e,i){if(!Wt(this.joy,"settle"))return;const r=this.curves[t],s=r?.controlPoints[e];if(null===i||!r||!s)return;const n=Math.sign(s.target-i);0!==n&&(this._stopSettle(),this._settlePoint={entityId:r.entityId,curve:t,point:e,lightener:s.lightener,target:s.target},this._cancelSettleLoop=Xt(250,i=>{Vt()?this._stopSettle():this._settle={curve:t,point:e,dy:Yt(i,n)}},()=>this._stopSettle()))}_settlePointUnchanged(){const t=this._settlePoint;if(!t)return!1;const e=this.curves[t.curve],i=e?.controlPoints[t.point];return e?.entityId===t.entityId&&i?.lightener===t.lightener&&i?.target===t.target}_noteDiagonalHit(t,e){const{held:i,landed:r}=Qt(this._dragPointIdx,t,e,this._heldLines);this._heldLines=i,r&&(Vt()||this._startFlash(r),"function"==typeof navigator.vibrate&&window.matchMedia?.("(pointer: coarse)").matches&&navigator.vibrate(5))}_startFlash(t){this._stopFlash(),this._flash={kind:t,token:++this._flashToken},this._flashTimer=setTimeout(()=>this._stopFlash(),400)}_stopFlash(){this._flashTimer&&clearTimeout(this._flashTimer),this._flashTimer=null,this._flash=null}_renderDiagonalFlash(){const t=this._flash;if(!t)return W;const[e,i]=hi[t.kind];return ai(t.token,V`<line class="diagonal-flash" x1=${Et(0)} y1=${Pt(e)}
        x2=${Et(100)} y2=${Pt(i)} pointer-events="none" />`)}_stopSettle(){this._cancelSettleLoop?.(),this._cancelSettleLoop=null,this._settlePoint=null,this._settle=null}_startDrawIn(t){this._stopDrawIn(),this._reveal={token:t,progress:0},this.dispatchEvent(new CustomEvent("draw-in-started",{detail:{token:t,pointCount:this._drawInPointCount()},bubbles:!0,composed:!0})),this._cancelDrawInLoop=Xt(jt,e=>{this._reveal={token:t,progress:Ut(e/jt)}},()=>{this._reveal={token:t,progress:1}})}_stopDrawIn(){this._cancelDrawInLoop?.(),this._cancelDrawInLoop=null,this._pendingDrawInToken=null,this._reveal=null}_waitForDrawInVisibility(t){this._stopDrawIn(),this._pendingDrawInToken=t,this._reveal={token:t,progress:0},!1!==this.drawIn?.ready&&(this._drawInObserver?(this._drawInObserver.unobserve(this),this._drawInObserver.observe(this)):this._startDrawIn(t))}_drawInPointCount(){return this.readOnly?0:this.curves.reduce((t,e,i)=>e.visible&&this.drawIn?.ids.has(e.entityId)&&this._isCurveInteractive(i)?e.controlPoints.reduce((t,e,i)=>null===this.scrubberPosition||e.lightener<=this.scrubberPosition?Math.max(t,i+1):t,t):t,0)}_revealFor(t){return this.drawIn?.ids.has(t.entityId)?this._reveal:null}_drawInClipId(t,e){return`draw-in-${this._uid}-${e}-${t}`}_drawInDotClipId(t,e){return`draw-in-dot-${this._uid}-${e}-${t}`}_drawInClipFor(t,e){const i=this._revealFor(t);return i?`url(#${this._drawInClipId(e,i.token)})`:W}_drawInDotClipFor(t,e){const i=this._revealFor(t);return i?`url(#${this._drawInDotClipId(e,i.token)})`:W}_onPointContextMenu(t,e,i){t.preventDefault(),t.stopPropagation(),this.readOnly||this._isCurveInteractive(e)&&0!==i&&(this._interaction("start","mouse"),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})))}_onDblClick(t){this.readOnly||this._wasDragging||(performance.now()<this._suppressDblClickUntil?t.preventDefault():(this._interaction("start","mouse"),this._dispatchPointAddFromEvent(t)))}_onHitAreaPointerDown(t){this.readOnly||(this._interaction("start",t.pointerType||"mouse"),this._isNonMousePointer(t)&&(this._touchTapStart={pointerId:t.pointerId,pointerType:t.pointerType,clientX:t.clientX,clientY:t.clientY,startedAt:performance.now()},t.currentTarget.setPointerCapture?.(t.pointerId)))}_onHitAreaPointerUp(t){if(this.readOnly)return;if(!this._isNonMousePointer(t))return;const e=this._touchTapStart;if(this._touchTapStart=null,this._interaction("end",t.pointerType),!e||e.pointerId!==t.pointerId||e.pointerType!==t.pointerType)return;if(this._touchMoveDistance(e,t)>12)return void(this._lastTouchTap=null);const i=performance.now(),r=this._lastTouchTap;null!==r&&r.pointerType===t.pointerType&&i-r.startedAt<=350&&this._touchMoveDistance(r,t)<=12?(this._lastTouchTap=null,this._dispatchPointAddFromEvent(t)&&(t.preventDefault(),this._suppressDblClickUntil=i+450)):this._lastTouchTap={pointerId:t.pointerId,pointerType:t.pointerType,clientX:t.clientX,clientY:t.clientY,startedAt:i}}_onHitAreaPointerCancel(t){this._touchTapStart?.pointerId===t.pointerId&&(this._touchTapStart=null,this._interaction("cancel",t.pointerType))}_renderGrid(){return V`
      <defs>
        <clipPath id="graph-area-${this._uid}">
          <rect x="${14}" y="${-18}" width="${360}" height="${260}" />
        </clipPath>
        ${this.drawIn?this.curves.map((t,e)=>{const i=t.visible?this._revealFor(t):null;return i?(()=>{const t=354,r=null===this.scrubberPosition?t:Ct(Et(this.scrubberPosition),34,t),s=Math.min(t,r+(null===this.scrubberPosition?0:4)),n=Math.max(0,s-34)*i.progress,o=Math.max(0,t-r);return V`
                        <clipPath class="draw-in-clip" id="${this._drawInClipId(e,i.token)}" clipPathUnits="userSpaceOnUse">
                          <rect class="draw-in-reveal" x="${34}" y="0"
                            width="${n}" height="${St}" />
                          ${o>0?V`<rect class="draw-in-dim-span" x="${r}" y="0"
                                width="${o}" height="${St}" />`:W}
                        </clipPath>
                        <clipPath class="draw-in-dot-clip" id="${this._drawInDotClipId(e,i.token)}" clipPathUnits="userSpaceOnUse">
                          <rect x="${34}" y="0" width="${n}" height="${St}" />
                        </clipPath>`})():W}):W}
      </defs>

      <rect class="plot-frame"
        x="${xt}" y="${wt}"
        width="${$t}" height="${It}" />

      ${[0,25,50,75,100].map(t=>V`
        <!-- Vertical grid -->
        <line class="grid-line"
          x1="${Et(t)}" y1="${Pt(0)}"
          x2="${Et(t)}" y2="${Pt(100)}" />
        <!-- Horizontal grid -->
        <line class="grid-line"
          x1="${Et(0)}" y1="${Pt(t)}"
          x2="${Et(100)}" y2="${Pt(t)}" />
        <!-- X tick labels -->
        <text class="tick-label" text-anchor="middle"
          x="${Et(t)}" y="${228}">${t}%</text>
        <!-- Y tick labels -->
        <text class="tick-label" text-anchor="end" dominant-baseline="middle"
          x="${38}" y="${Pt(t)}">${t}%</text>
      `)}

      <!-- Axis border lines -->
      <line class="axis-line"
        x1="${xt}" y1="${Pt(0)}"
        x2="${344}" y2="${Pt(0)}" />
      <line class="axis-line"
        x1="${xt}" y1="${Pt(0)}"
        x2="${xt}" y2="${Pt(100)}" />

      <!-- Axis labels: x-axis is labeled by the slider above the graph; the
           y-axis label stays inline (no other surface labels it). -->
      <text class="axis-label" text-anchor="middle"
        transform="rotate(-90, 10, ${112})"
        x="10" y="${112}">${vt.graph.yAxisLabel}</text>
    `}_renderCrossHair(t){if(this._dragCurveIdx<0)return W;const e=t.controlPoints[this._dragPointIdx];if(!e)return W;const i=Et(e.lightener),r=Pt(e.target);return V`
      <line class="crosshair"
        x1="${i}" y1="${r}"
        x2="${i}" y2="${Pt(0)}"
        stroke="${t.color}" opacity="0.5" />
      <line class="crosshair"
        x1="${i}" y1="${r}"
        x2="${xt}" y2="${r}"
        stroke="${t.color}" opacity="0.5" />
    `}_renderTooltip(t,e=t){const i=Et(e.lightener),r=Pt(e.target),s=`Group ${t.lightener}% -> Light ${t.target}%`,n=Math.ceil(4.9*s.length),o=Ct(i-n/2-2,xt,344-n-8),a=Math.max(16,r-16);return V`
      <rect class="tooltip-bg"
        x="${o}" y="${a-8}"
        width="${n+8}" height="14" />
      <text class="tooltip-text" text-anchor="start"
        x="${o+4}" y="${a+2}">${s}</text>
    `}_renderScrubberIndicator(){if(null===this.scrubberPosition)return W;const t=this.scrubberPosition,e=Et(t),i=e-(0===t?2:0),r=100===t?W:V`
      <rect
        x="${i}" y="${Pt(100)-2}"
        width="${Et(100)+2-i}" height="${204}"
        fill="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))"
        fill-opacity="0.93"
        pointer-events="none"
      />
    `,s=V`
      <line class="scrubber-line"
        x1="${e}" y1="${Pt(0)}"
        x2="${e}" y2="${Pt(100)}" />
    `,n=this.curves.map((i,r)=>{if(!i.visible)return W;const s=this._frameFor(i),n=Pt(s?Ot(s.pieces,t):Mt(i.controlPoints,t));return V`
          <circle
            class="scrubber-dot"
            clip-path="${this._drawInDotClipFor(i,r)}"
            cx="${e}" cy="${n}"
            r="${4}"
            fill="${i.color}"
            filter="url(#scrubber-glow-${i.color.replace("#","")}-${this._uid})"
            pointer-events="none"
          />
        `});return V`${r}${s}${n}`}_frameFor(t){return this.curveFrame?.entityId===t.entityId?this.curveFrame:null}_orderedCurves(){const t=this.selectedCurveId?this.curves.findIndex(t=>t.entityId===this.selectedCurveId):-1;return t>=0?[...this.curves.slice(0,t).map((t,e)=>({curve:t,idx:e})),...this.curves.slice(t+1).map((e,i)=>({curve:e,idx:t+1+i})),{curve:this.curves[t],idx:t}]:this.curves.map((t,e)=>({curve:t,idx:e}))}_renderCurvePaths(t,e){if(!t.visible||!t.controlPoints.length)return W;try{const i=null===this.selectedCurveId||t.entityId===this.selectedCurveId,r=this._dragCurveIdx===e,s=i?1:.2,n=this._frameFor(t),o=bt(t.controlPoints),a=n?function(t){if(!t.length)return"";let e=`M${Et(t[0].x0)},${Pt(t[0].y[0])}`;for(const i of t){const t=(i.x1-i.x0)/3;e+=` C${Et(i.x0+t)},${Pt(i.y[1])} ${Et(i.x1-t)},${Pt(i.y[2])} ${Et(i.x1)},${Pt(i.y[3])}`}return e}(n.pieces):Dt(o.map(t=>({x:Et(t.lightener),y:Pt(t.target)}))),l=a+` L${Et(n?n.pieces[n.pieces.length-1]?.x1??100:o[o.length-1].lightener)},${Pt(0)}`+` L${Et(0)},${Pt(0)} Z`,h=`grad-${e}-${this._uid}`,d=null===this.selectedCurveId?Ft[e%Ft.length]:t.entityId===this.selectedCurveId?"":Ft[e%(Ft.length-1)+1],c=null!==this.selectedCurveId&&t.entityId===this.selectedCurveId,p=this._drawInClipFor(t,e);return V`
        ${c?V`
              <defs>
                <linearGradient id="${h}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${t.color}" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="${t.color}" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <path
                clip-path="${p}"
                d="${l}"
                fill="url(#${h})"
                style="opacity: ${s}"
                pointer-events="none"
              />`:W}
        ${r?this._renderCrossHair(t):W}
        <path
          class="curve-line"
          clip-path="${p}"
          d="${a}"
          stroke="${t.color}"
          stroke-dasharray="${d}"
          style="opacity: ${s}"
          pointer-events="none"
        />
      `}catch{return W}}_renderCurvePoints(t,e){if(!t.visible||!t.controlPoints.length)return W;try{const i=this._isCurveInteractive(e);if(!(i&&!this.readOnly))return W;const r=this._dragCurveIdx===e,s=t.color+"33";let n=-1;r&&this._dragPointIdx>=0?n=this._dragPointIdx:this._hoveredPoint?.curve!==e&&this._focusedPoint?.curve!==e||(n=this._focusedPoint?.curve===e?this._focusedPoint.point:this._hoveredPoint?.point??-1);const o=t.controlPoints[n]??null,a=this._frameFor(t)?.knots??null,l=this._revealFor(t);return V`
        ${t.controlPoints.map((i,n)=>{const o=null!==l&&(null===this.scrubberPosition||i.lightener<=this.scrubberPosition),h=a?.[n]??i,d=0===n,c=r&&this._dragPointIdx===n,p=this._hoveredPoint?.curve===e&&this._hoveredPoint?.point===n,u=null!==this.scrubberPosition&&i.lightener>this.scrubberPosition?.35:1,g=this._settle?.curve===e&&this._settle.point===n?this._settle.dy:0,_=function(t,e,i,r,s,n,o,a,l){const h=`--glow-color: ${l}; opacity: ${a}`,d=`${s} shape-${t}`;switch(t){case"circle":return V`<circle
        class="${d}"
        cx="${e}"
        cy="${i}"
        r="${r}"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`;case"square":{const t=1.15*r;return V`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-t/2}"
        width="${t}"
        height="${t}"
        rx="1.5"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`}case"diamond":{const t=1.3*r;return V`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-t/2}"
        width="${t}"
        height="${t}"
        rx="1"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`}case"triangle":{const t=1.15*r,s=1.3*r;return V`<polygon
        class="${d}"
        points="${e},${i-t} ${e-s},${i+.65*t} ${e+s},${i+.65*t}"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`}case"bar":{const t=2*r,s=.75*r;return V`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-s/2}"
        width="${t}"
        height="${s}"
        rx="1.5"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`}default:return t}}(Gt[e%Gt.length],Et(h.lightener),Pt(h.target)+g,6,`control-point ${d?"origin":""} ${c?"dragging":""} ${p?"hovered":""} ${this._focusedPoint?.curve===e&&this._focusedPoint?.point===n?"focused":""}`,s,t.color,u,t.color);return V`
            <circle
              class="hit-circle ${d?"origin-hit":""}"
              data-curve="${e}"
              data-point="${n}"
              cx="${Et(h.lightener)}"
              cy="${Pt(h.target)}"
              r="${this._isMobile?28:22}"
              fill="transparent"
              pointer-events="all"
              tabindex="0"
              role="button"
              aria-describedby=${t.entityId===this.exampleEntityId?`example-${this._uid}`:W}
              aria-label="${t.friendlyName} point ${i.lightener}% group brightness to ${i.target}% light brightness. ${0===n?"Arrow Up/Down to adjust starting brightness. Cannot be moved horizontally.":"Arrow keys move, Enter adds a nearby point, Space removes."}"
              style="touch-action: none; -webkit-touch-callout: none"
              @pointerdown=${t=>this._onPointerDown(t,e,n)}
              @contextmenu=${t=>this._onPointContextMenu(t,e,n)}
              @pointerenter=${()=>this._hoveredPoint={curve:e,point:n}}
              @pointerleave=${()=>this._hoveredPoint=null}
              @pointercancel=${()=>{this._hoveredPoint=null,this._focusedPoint=null}}
              @focus=${()=>this._onPointFocus(e,n)}
              @blur=${()=>this._onPointBlur(e,n)}
              @keydown=${t=>this._onPointKeyDown(t,e,n)}
            />
            ${o&&l?null!==this._pendingDrawInToken?V`<g class="marker-wait" visibility="hidden">${_}</g>`:ai(`${l.token}:${t.entityId}:${n}`,V`<g class="marker-pop"
                    style="animation-delay: ${jt+40*n}ms">${_}</g>`):_}
          `})}
        ${null!==o?this._renderTooltip(o,a?.[n]??o):W}
      `}catch{return W}}willUpdate(t){t.has("entityId")&&this._stopDrawIn();const e=this.drawIn,i=null!==e&&this.isConnected&&Wt(this.joy,"draw_in"),r=null!==e&&(this._reveal?.token===e.token||this._pendingDrawInToken===e.token);if(e&&r&&i||this._stopDrawIn(),e&&e.token>this._lastDrawInToken?(this._lastDrawInToken=e.token,i&&this._waitForDrawInVisibility(e.token)):i&&t.has("drawIn")&&this._pendingDrawInToken===e.token&&!1!==e.ready&&this._waitForDrawInVisibility(e.token),t.has("joy")&&!this.joy.diagonal&&this._stopFlash(),!this._cancelSettleLoop)return;const s=t.has("joy")&&!this.joy.settle,n=t.has("curves")&&!this._settlePointUnchanged();(s||n)&&this._stopSettle()}connectedCallback(){super.connectedCallback(),this._mql=window.matchMedia("(max-width: 500px)"),this._isMobile=this._mql.matches,this._mql.addEventListener("change",this._onMqlChange),"undefined"!=typeof IntersectionObserver&&(this._drawInObserver=new IntersectionObserver(this._onDrawInIntersection,{threshold:.5}),this._drawInObserver.observe(this))}disconnectedCallback(){this.cancelInteraction(),super.disconnectedCallback(),this._stopDrawIn(),this._drawInObserver?.disconnect(),this._drawInObserver=null,this._mql?.removeEventListener("change",this._onMqlChange),this._mql=null}_getSvgDescription(){const t=this.curves.filter(t=>t.visible);if(!t.length)return"No curves displayed";const e=t.map(t=>{const e=t.controlPoints.reduce((t,e)=>Number.isFinite(e.target)?Math.max(t,e.target):t,0);return`${t.friendlyName} (${t.controlPoints.length} points, max ${e}%)`});return`${t.length} curve${1===t.length?"":"s"}: ${e.join(", ")}`}_renderExampleInstruction(){const t=this.curves.findIndex(t=>t.entityId===this.exampleEntityId),e=this.curves[t];if(!e||!this.exampleInstruction)return W;const i=e.controlPoints.reduce((t,e)=>Math.abs(e.lightener-50)<Math.abs(t.lightener-50)?e:t),r=Pt(i.target)-wt>=44,s=r?-1:1,n="circle"===Gt[t%Gt.length]?this.exampleInstruction:vt.invitation.dragPoint;return V`<g class="example-instruction ${this.exampleCueAnimating?"example-cue-animating":""}"
      transform="translate(${Et(i.lightener)} ${Pt(i.target)})" aria-hidden="true">
      <circle class="example-cue-ring" r="15" />
      <path class="example-cue-leader" d="M -11 ${11*s} Q -16 ${35*s} -24 ${35*s}" />
      <text class="example-cue-label" x="-27" y=${35*s+(r?0:10)}
        text-anchor="end">${n}</text>
    </g>`}_renderCenteredHintBand(t,e,i,r){return V`
      <rect
        class="hint-band"
        x="${194-t/2}"
        y="${i-e/2}"
        width="${t}"
        height="${e}"
        rx="8"
        pointer-events="none"
      />
      ${r}
    `}_renderPreviewCurve(){const t=this.previewCurve;if(!t||!t.controlPoints.length)return W;try{const e=bt(t.controlPoints),i=Dt(e.map(t=>({x:Et(t.lightener),y:Pt(t.target)}))),r=null!==this.scrubberPosition?V`
              <circle
                class="preview-curve-point"
                r="3"
                cx="${Et(this.scrubberPosition)}"
                cy="${Pt(Mt(t.controlPoints,this.scrubberPosition))}"
              />`:W;return V`
        <g
          class="preview-curve"
          clip-path="url(#graph-area-${this._uid})"
          style="--preview-color: ${t.color}"
        >
          <path
            class="preview-curve-line"
            d="${i}"
            stroke="${t.color}"
          />
          ${r}
        </g>
      `}catch{return W}}render(){return q`
      <svg
        viewBox="0 0 ${kt} ${St}"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Brightness curve editor graph"
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @lostpointercapture=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
        @dblclick=${this._onDblClick}
        @contextmenu=${t=>{this.readOnly||t.preventDefault()}}
      >
        <desc>${this._getSvgDescription()}</desc>
        ${this._renderGrid()}

        <!-- Invisible hit area for double-click -->
        ${this.readOnly?W:V`<rect
              class="hit-area"
              x="${xt}"
              y="${wt}"
              width="${$t}"
              height="${It}"
              pointer-events="all"
              fill="transparent"
              @pointerdown=${this._onHitAreaPointerDown}
              @pointerup=${this._onHitAreaPointerUp}
              @pointercancel=${this._onHitAreaPointerCancel}
            />`}
        ${this.joy.diagonal?V`<line class="diagonal-ref" x1=${Et(0)} y1=${Pt(0)}
              x2=${Et(100)} y2=${Pt(100)} pointer-events="none" />`:W}
        <!-- Phase 1: curve fills and lines (rendered before scrubber overlay) -->
        ${(()=>{const t=this._orderedCurves();return V`<g clip-path="url(#graph-area-${this._uid})">${t.map(({curve:t,idx:e})=>this._renderCurvePaths(t,e))}</g>`})()}
        ${this._renderDiagonalFlash()}
        <!-- Scrubber glow filters (only re-render when curves change, not on every position update) -->
        <defs>
          ${this.curves.filter(t=>t.visible).map(t=>{const e=`scrubber-glow-${t.color.replace("#","")}-${this._uid}`;return V`
              <filter id="${e}" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feFlood flood-color="${t.color}" flood-opacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>`})}
        </defs>
        ${this.exampleEntityId?V`<desc id="example-${this._uid}">${vt.invitation.description}</desc>`:W}
        ${this._renderScrubberIndicator()} ${this._renderPreviewCurve()}
        <!-- Phase 3: control points rendered after scrubber overlay so they are always visible -->
        ${(()=>V`<g clip-path="url(#graph-area-${this._uid})">${this.curves.map((t,e)=>this._renderCurvePoints(t,e))}</g>`)()}
        ${this._renderExampleInstruction()}
        ${(()=>{if(this.readOnly)return W;if(0===this.curves.length){const t=112;return this._renderCenteredHintBand(220,32,t,V`<text class="hint hint-select" text-anchor="middle"
                x="${194}" y="${t+4}"
                pointer-events="none"
                >Add a light below to get started</text>`)}return W})()}
      </svg>
    `}}di.styles=a`
    .example-instruction {
      pointer-events: none;
      animation: invitation-appear ${Bt.cueFade}ms ease-out both;
    }
    @keyframes invitation-appear {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .example-cue-ring,
    .example-cue-leader {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 1.2;
    }
    .example-cue-ring {
      opacity: 0.6;
      transform-box: fill-box;
      transform-origin: center;
    }
    .example-cue-leader {
      stroke-dasharray: 2 3;
      opacity: 0.8;
    }
    .example-cue-animating .example-cue-ring {
      animation: example-point-invite ${Bt.pulse}ms ease-out infinite;
    }
    @keyframes example-point-invite {
      0%,
      100% {
        opacity: 0.3;
        transform: scale(0.85);
      }
      45% {
        opacity: 0.9;
        transform: scale(1.2);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .example-instruction,
      .example-cue-animating .example-cue-ring {
        animation: none;
      }
    }
    .example-cue-label {
      fill: color-mix(
        in srgb,
        var(--primary-color, #03a9f4) 35%,
        var(--primary-text-color, #212121)
      );
      font-size: 14px;
      font-weight: 600;
      paint-order: stroke;
      stroke: var(--card-background-color, #fff);
      stroke-width: 5px;
      stroke-linejoin: round;
    }
    :host {
      display: block;
    }
    svg {
      width: 100%;
      height: auto;
      min-height: var(--curve-graph-min-height, 0);
      max-height: var(--curve-graph-max-height, 320px);
      display: block;
      border-radius: 6px;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .grid-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.5;
      opacity: 0.15;
    }
    .axis-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.75;
      opacity: 0.4;
    }
    .plot-frame {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--divider-color, rgba(127, 127, 127, 0.2));
      stroke-width: 0.75;
      opacity: 0.95;
    }
    .axis-label {
      fill: var(--secondary-text, #616161);
      font-size: 10px;
      font-weight: 500;
      font-family: inherit;
    }
    .tick-label {
      fill: var(--secondary-text, #616161);
      font-size: 10px;
      font-weight: 500;
      font-family: inherit;
    }
    .curve-line {
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: opacity 0.3s ease;
    }
    .marker-pop {
      transform-box: fill-box;
      transform-origin: center;
      animation: marker-pop ${o(`150ms ${zt}`)} both;
    }
    @keyframes marker-pop {
      0% {
        transform: scale(0);
      }
      70% {
        transform: scale(1.15);
      }
      100% {
        transform: scale(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .marker-pop {
        animation: none;
      }
    }
    .preview-curve-line {
      fill: none;
      stroke-width: 1.25;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 4 4;
      opacity: 0.7;
      pointer-events: none;
    }
    .preview-curve-point {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--preview-color, #42a5f5);
      stroke-width: 1.25;
      opacity: 0.7;
      pointer-events: none;
    }
    /* Marker growth is driven by a transform scale, NOT by the SVG \`r\`
       geometry property. \`r\` only exists on <circle>, so the rect/polygon
       markers used by every curve after the first never grew on hover, focus
       or drag, so on four of the five LEGEND_SHAPES the glow was the only
       thing that answered. The two custom properties compose: the diamond
       needs its 45deg
       rotation and its scale in one transform, and a plain \`transform:\`
       override in a more specific rule would drop the rotation. */
    .control-point {
      --cp-rotate: 0deg;
      --cp-scale: 1;
      cursor: grab;
      transform-box: fill-box;
      transform-origin: center;
      transform: rotate(var(--cp-rotate)) scale(var(--cp-scale));
      transition:
        transform 0.15s ease,
        filter 0.15s ease;
    }
    /* The diamond is a square turned 45deg. It used to carry a
       \`transform="rotate(45 cx cy)"\` presentation attribute; a CSS transform
       overrides that attribute entirely, so the rotation lives here now. */
    .control-point.shape-diamond {
      --cp-rotate: 45deg;
    }
    .control-point:hover,
    .control-point.hovered,
    .control-point.focused {
      --cp-scale: 1.25;
      filter: drop-shadow(0 0 6px var(--glow-color, #42a5f5));
    }
    .control-point.dragging {
      --cp-scale: 1.33;
      cursor: grabbing;
      filter: drop-shadow(0 0 8px var(--glow-color, #42a5f5));
    }
    @media (prefers-reduced-motion: reduce) {
      .control-point {
        transition: filter 0.15s ease;
      }
    }
    .control-point.origin {
      stroke-dasharray: 2 2;
    }
    .hit-circle.origin-hit {
      cursor: ns-resize;
    }
    .hit-circle:focus-visible {
      outline: none;
    }
    .hit-area {
      fill: transparent;
      cursor: crosshair;
    }
    .diagonal-ref {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.75;
      stroke-dasharray: 3 4;
      opacity: 0.3;
    }
    .diagonal-flash {
      stroke: var(--primary-color, #2563eb);
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0;
      animation: diagonal-flash ${o("400ms")}
        ${o(zt)} forwards;
    }
    @keyframes diagonal-flash {
      0% {
        opacity: 0;
      }
      25% {
        opacity: 0.9;
      }
      100% {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .diagonal-flash {
        display: none;
      }
    }
    .hint {
      fill: var(--primary-text-color, #212121);
      font-size: 11px;
      font-family: inherit;
      opacity: 0.86;
      /* Empty-state hints sit on a .hint-band. Keep the stroke halo so the
         text stays legible if a theme makes the band translucent. */
      paint-order: stroke;
      stroke: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke-width: 2.5px;
      stroke-linejoin: round;
    }
    .hint-band {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--divider-color, rgba(127, 127, 127, 0.2));
      stroke-width: 1;
      opacity: 0.96;
      pointer-events: none;
    }
    .hint.hint-select {
      pointer-events: none;
    }
    .hint-select {
      font-weight: 600;
      opacity: 0.92;
    }
    .crosshair {
      stroke-width: 0.75;
      stroke-dasharray: 3 3;
    }
    @media ${Ne} {
      .example-cue-label {
        font-size: 16px;
      }
      svg {
        min-height: 180px;
      }
      .axis-label,
      .tick-label {
        font-size: 12px;
      }
      .hint {
        font-size: 14px;
      }
      .tooltip-text {
        font-size: 11px;
      }
    }
    .scrubber-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.75;
      stroke-dasharray: 3 3;
      opacity: 0.3;
    }
    .scrubber-dot {
      stroke: none;
    }
    .tooltip-bg {
      fill: var(--tooltip-background-color, var(--primary-text-color, #212121));
      rx: 3;
      ry: 3;
      opacity: 0.94;
      /* The tooltip sits above its point; it must never steal the pointer from
         the hit-circle or hover enters a show/hide loop (flicker on vertical
         approach). */
      pointer-events: none;
    }
    .tooltip-text {
      fill: var(--tooltip-text-color, var(--card-background-color, #fff));
      font-size: 9.5px;
      font-family: inherit;
      pointer-events: none;
    }
  `,t([gt({type:Array})],di.prototype,"curves",void 0),t([gt({type:String})],di.prototype,"selectedCurveId",void 0),t([gt({type:String})],di.prototype,"entityId",void 0),t([gt({type:Boolean})],di.prototype,"readOnly",void 0),t([gt({type:Number})],di.prototype,"scrubberPosition",void 0),t([gt({attribute:!1})],di.prototype,"previewCurve",void 0),t([gt({attribute:!1})],di.prototype,"exampleEntityId",void 0),t([gt({attribute:!1})],di.prototype,"exampleInstruction",void 0),t([gt({type:Boolean})],di.prototype,"exampleCueAnimating",void 0),t([gt({attribute:!1})],di.prototype,"joy",void 0),t([gt({attribute:!1})],di.prototype,"curveFrame",void 0),t([gt({attribute:!1})],di.prototype,"drawIn",void 0),t([_t()],di.prototype,"_dragCurveIdx",void 0),t([_t()],di.prototype,"_dragPointIdx",void 0),t([_t()],di.prototype,"_hoveredPoint",void 0),t([_t()],di.prototype,"_focusedPoint",void 0),t([_t()],di.prototype,"_isMobile",void 0),t([_t()],di.prototype,"_settle",void 0),t([_t()],di.prototype,"_flash",void 0),t([_t()],di.prototype,"_reveal",void 0),t([function(t){return(e,i,r)=>((t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,i),i))(e,i,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}("svg")],di.prototype,"_svgRef",void 0),ke("curve-graph",di);class ci extends dt{constructor(){super(...arguments),this.curves=[],this.readOnly=!1,this.previewActive=!1,this.canPreview=!1,this.dirty=!1,this.example=!1,this.invitation=!1,this.firstUseHints=!1,this.position=null,this._dragging=!1,this._trackRef=null}_onPointerDown(t){this.readOnly||(t.preventDefault(),this._dragging=!0,t.target.setPointerCapture(t.pointerId),this._updatePositionFromClient(t.clientX),this.dispatchEvent(new CustomEvent("scrubber-start",{bubbles:!0,composed:!0})))}_onPointerMove(t){this._dragging&&(t.preventDefault(),this._updatePositionFromClient(t.clientX))}_onPointerUp(){this._dragging&&(this._dragging=!1,this.dispatchEvent(new CustomEvent("scrubber-end",{bubbles:!0,composed:!0})))}_onTrackClick(t){this.readOnly||this._updatePositionFromClient(t.clientX)}_onKeyDown(t){if(this.readOnly)return;const e=t.shiftKey?10:1,i=Math.min(100,Math.max(0,this.position??50));let r;if("ArrowRight"===t.key||"ArrowUp"===t.key)t.preventDefault(),r=Math.min(100,i+e);else if("ArrowLeft"===t.key||"ArrowDown"===t.key)t.preventDefault(),r=Math.max(0,i-e);else if("Home"===t.key)t.preventDefault(),r=0;else{if("End"!==t.key)return;t.preventDefault(),r=100}this._emitPosition(r)}_updatePositionFromClient(t){const e=this._trackRef;if(!e)return;const i=e.getBoundingClientRect(),r=(t-i.left)/i.width*100,s=Math.max(0,Math.min(100,r));this._emitPosition(s)}_emitPosition(t){this.dispatchEvent(new CustomEvent("scrubber-move",{detail:{position:t},bubbles:!0,composed:!0}))}_onPreviewToggle(){this.dispatchEvent(new CustomEvent("preview-toggle",{bubbles:!0,composed:!0}))}firstUpdated(){this._trackRef=this.renderRoot.querySelector(".track-area")}render(){const t=Math.min(100,Math.max(0,this.position??50)),e=Math.round(t);return q`
      <div class="scrubber-panel">
        <div class="scrubber-header">
          <div class="scrubber-heading">
            <div class="scrubber-title">${vt.scrubber.title}</div>
            ${this.firstUseHints?q`<div class="invitation-caption">
                  ${this.invitation?vt.invitation.together:this.example?vt.invitation.example:W}
                </div>`:W}
          </div>
          ${this.canPreview?this.previewActive?q`<button class="preview-toggle-btn active" @click=${this._onPreviewToggle}>
                  <span class="preview-live-dot"></span>
                  ${vt.scrubber.watchingPrefix} &nbsp;·&nbsp;
                  <span class="preview-restore-text">${vt.scrubber.watchingRestore}</span>
                </button>`:q`<button class="preview-toggle-btn" @click=${this._onPreviewToggle}>
                  ${vt.scrubber.watchButton}
                </button>`:W}
        </div>
        ${this.previewActive&&this.dirty?q`<div class="preview-status">
              ${vt.scrubber.heldStatus} &nbsp;·&nbsp; ${vt.scrubber.heldStatusSave}
            </div>`:W}
        <div
          class="track-area"
          role="slider"
          tabindex="${this.readOnly?-1:0}"
          aria-disabled="${this.readOnly}"
          aria-label=${vt.scrubber.sliderAria}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${e}
          aria-valuetext="${e}% group brightness"
          @click=${this._onTrackClick}
          @keydown=${this._onKeyDown}
        >
          <div class="track-bg"></div>
          <!-- Direct input follows the current value without a trailing layout animation. -->
          <div class="track-fill" style="transform: scaleX(${t/100})"></div>
          <div class="position-label" style="left: ${t}%">${e}%</div>
          <div
            class="thumb ${this._dragging?"dragging":""}"
            style="left: ${t}%"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @lostpointercapture=${this._onPointerUp}
          ></div>
        </div>
      </div>
    `}}ci.styles=a`
    .invitation-caption {
      height: 16px;
      font-size: 11px;
      line-height: 16px;
      color: var(--secondary-text-color, #616161);
      white-space: nowrap;
    }
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .scrubber-panel {
      border-radius: 12px;
      padding: 12px;
      background: color-mix(
        in srgb,
        var(--ha-card-background, var(--card-background-color, #fff)) 95%,
        var(--secondary-text-color, #616161) 5%
      );
    }
    .scrubber-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      min-height: 26px;
    }
    .scrubber-heading {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .scrubber-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
      line-height: 1.2;
    }
    .preview-toggle-btn {
      border: 1px solid var(--divider);
      border-radius: 999px;
      padding: 4px 11px;
      font-size: 10px;
      font-weight: 500;
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 5px;
      transition:
        border-color 0.15s,
        color 0.15s,
        background 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .preview-toggle-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .preview-toggle-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .preview-toggle-btn.active {
      border-color: var(--accent);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 6%, transparent);
    }
    .preview-live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      opacity: 0.75;
      flex-shrink: 0;
    }
    .preview-restore-text {
      opacity: 0.7;
    }
    .preview-status {
      font-size: 11px;
      font-weight: 500;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 5%, transparent);
      border-radius: 8px;
      padding: 5px 10px;
      margin-bottom: 10px;
    }
    @media (prefers-reduced-motion: reduce) {
      .preview-live-dot {
        opacity: 0.6;
      }
    }
    .track-area {
      position: relative;
      height: 28px;
      cursor: pointer;
      touch-action: none;
      /* Align with graph plot area: scrubber panel now has same 12px side
         padding as graph panel, so % margins match the SVG axis padding. */
      margin-left: ${xt/kt*100}%;
      margin-right: ${12/kt*100}%;
    }
    .track-bg {
      position: absolute;
      top: 12px;
      left: 0;
      right: 0;
      height: 4px;
      border-radius: 2px;
      background: color-mix(in srgb, var(--accent) 25%, transparent);
    }
    .track-fill {
      position: absolute;
      top: 12px;
      left: 0;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      transform-origin: left center;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--accent) 25%, transparent),
        var(--accent)
      );
    }
    .thumb {
      position: absolute;
      top: 6px;
      width: 16px;
      height: 16px;
      background: var(--accent);
      border-radius: 50%;
      transform: translateX(-50%);
      cursor: grab;
      border: 2px solid var(--ha-card-background, var(--card-background-color, #fff));
      box-shadow: 0 2px 6px color-mix(in srgb, var(--accent) 30%, transparent);
      transition: box-shadow 0.15s ease;
      z-index: 2;
    }
    .thumb::after {
      content: '';
      position: absolute;
      top: -14px;
      left: -14px;
      right: -14px;
      bottom: -14px;
    }
    .thumb:hover {
      box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 45%, transparent);
    }
    .thumb.dragging {
      cursor: grabbing;
      box-shadow: 0 2px 14px color-mix(in srgb, var(--accent) 50%, transparent);
    }
    .position-label {
      position: absolute;
      top: -10px;
      font-size: 10px;
      font-weight: 600;
      color: var(--accent);
      transform: translateX(-50%);
      user-select: none;
      font-variant-numeric: tabular-nums;
      pointer-events: none;
    }
    @media ${Ne} {
      .track-area {
        height: 36px;
      }
      .track-bg {
        top: 17px;
      }
      .track-fill {
        top: 17px;
      }
      .thumb {
        width: 20px;
        height: 20px;
        top: 8px;
      }
      .position-label {
        font-size: 12px;
      }
      .scrubber-title {
        font-size: 13px;
      }
      .preview-toggle-btn {
        font-size: 11px;
        padding: 0 12px;
        min-height: 44px;
      }
      .scrubber-header {
        align-items: flex-start;
      }
    }
  `,t([gt({type:Array})],ci.prototype,"curves",void 0),t([gt({type:Boolean})],ci.prototype,"readOnly",void 0),t([gt({type:Boolean})],ci.prototype,"previewActive",void 0),t([gt({type:Boolean})],ci.prototype,"canPreview",void 0),t([gt({type:Boolean})],ci.prototype,"dirty",void 0),t([gt({type:Boolean})],ci.prototype,"example",void 0),t([gt({type:Boolean})],ci.prototype,"invitation",void 0),t([gt({type:Boolean})],ci.prototype,"firstUseHints",void 0),t([gt({type:Number})],ci.prototype,"position",void 0),t([_t()],ci.prototype,"_dragging",void 0),ke("curve-scrubber",ci);function pi(t){return t.replace(/[ \t\n\r\f]+/g," ").replace(/^ | $/g,"")}class ui extends dt{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.exampleEntityId=null,this.scrubberPosition=null,this.canManage=!1,this.managing=!1,this._confirmingDeleteGroup=!1}_select(t){this.dispatchEvent(new CustomEvent("select-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_toggle(t,e){t.stopPropagation(),this.dispatchEvent(new CustomEvent("toggle-curve",{detail:{entityId:e},bubbles:!0,composed:!0}))}willUpdate(t){super.willUpdate(t),!t.has("canManage")&&!t.has("managing")||this.canManage&&!this.managing||(this._confirmingDeleteGroup=!1)}_onItemKeyDown(t){if("ArrowDown"===t.key||"ArrowUp"===t.key){t.preventDefault();const e=[...this.renderRoot.querySelectorAll(".row-select-btn")],i=e.indexOf(t.currentTarget),r="ArrowDown"===t.key?i+1:i-1;e[r]?.focus()}}_onToggleKeyDown(t,e){"Enter"!==t.key&&" "!==t.key||(t.preventDefault(),this._toggle(t,e))}_openEditLights(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("edit-lights",{bubbles:!0,composed:!0})))}render(){const t=this.curves.map(t=>pi(t.friendlyName)),e=new Map;for(const i of t)e.set(i,(e.get(i)??0)+1);const i=t.map(t=>(e.get(t)??0)>1),r=this.curves.map((t,e)=>i[e]?`${t.friendlyName} (${t.entityId})`:t.friendlyName),s=new Map;for(const t of r){const e=pi(t);s.set(e,(s.get(e)??0)+1)}const n=new Set(r.map(pi));for(let t=0;t<r.length;t++)if((s.get(pi(r[t]))??0)>1){do{r[t]+=` (${this.curves[t].entityId})`}while(n.has(pi(r[t])));n.add(pi(r[t]))}const o=this.curves.filter(t=>t.visible).length,a=this.curves.length-o,l=0===this.curves.length?vt.legend.emptyCount:0===a?vt.legend.countAllVisible(this.curves.length):vt.legend.countWithHidden(o,a),h=this.curves.length>=20;return q`
      <div
        class="legend-panel ${h?"large-group":""}"
        data-density=${h?"large":"normal"}
      >
        <div class="legend-header">
          <div class="legend-label">${vt.legend.title}</div>
          <div class="legend-count" title=${l}>${l}</div>
        </div>
        <div class="legend" role="list" aria-label=${vt.legend.listAria(this.curves.length)}>
          ${this.curves.map((t,e)=>{const i=r[e],s=null===this.scrubberPosition?null:Tt(t.controlPoints,Math.round(this.scrubberPosition)),n=0===s?vt.legend.off:null!==s&&0===Math.round(s)?"<1%":`${Math.round(s??0)}%`,o=null===s?i:`${i} ${n}`,a=this.selectedCurveId===t.entityId;return q`
              <div
                class="legend-item ${t.visible?"":"hidden"} ${a?"selected":""}"
                role="listitem"
                style="--accent-color: ${t.color}"
              >
                <button
                  type="button"
                  class="row-select-btn"
                  aria-label=${t.entityId===this.exampleEntityId?`${o} · ${vt.invitation.values}`:o}
                  aria-pressed=${a?"true":"false"}
                  @click=${()=>this._select(t.entityId)}
                  @keydown=${t=>this._onItemKeyDown(t)}
                >
                  <span
                    class="color-dot shape-${ui._shapes[e%ui._shapes.length]}"
                    style="background: ${t.color}; --dot-color: ${t.color}"
                  ></span>
                  <span class="name-block">
                    <span class="name" title=${t.friendlyName}>${t.friendlyName}</span>
                    <span class="entity-id" title=${t.entityId}>${t.entityId}</span>
                  </span>
                  ${null!==s?q`<span
                        class="brightness-value"
                        title=${t.entityId===this.exampleEntityId?vt.invitation.values:""}
                        >${t.entityId===this.exampleEntityId?"≈ ":""}${n}</span
                      >`:W}
                </button>
                <button
                  type="button"
                  class="eye-btn"
                  aria-label="${t.visible?"Hide":"Show"} ${i}"
                  aria-pressed=${!t.visible}
                  @click=${e=>this._toggle(e,t.entityId)}
                  @keydown=${e=>this._onToggleKeyDown(e,t.entityId)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    ${t.visible?V`
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              `:V`
                                <path
                                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                                />
                                <path
                                  d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                                />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              `}
                  </svg>
                </button>
              </div>
            `})}
        </div>
        ${this.canManage||this.managing?q`
              <div class="add-divider"></div>
              ${this.managing?q`<div class="add-row">
                    <div class="managing-row" role="status" aria-live="polite">
                      <span class="spinner" aria-hidden="true"></span>
                      Updating lights…
                    </div>
                  </div>`:q`
                    <div class="add-row">
                      <button
                        type="button"
                        class="add-light-btn"
                        ?disabled=${this.managing}
                        @click=${this._openEditLights}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 6h16M4 12h16M4 18h16"></path>
                          <circle cx="8" cy="6" r="1.5" fill="currentColor"></circle>
                          <circle cx="15" cy="12" r="1.5" fill="currentColor"></circle>
                          <circle cx="11" cy="18" r="1.5" fill="currentColor"></circle>
                        </svg>
                        Edit lights
                      </button>
                    </div>
                  `}
              ${this.canManage?q`
                    <div class="delete-group-row">
                      ${this._confirmingDeleteGroup?q`
                            <div class="delete-group-confirm">
                              <span class="delete-group-text">Delete this group?</span>
                              <div class="delete-group-actions">
                                <button
                                  type="button"
                                  class="delete-group-btn cancel"
                                  ?disabled=${this.managing}
                                  @click=${this._cancelDeleteGroup}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  class="delete-group-btn danger"
                                  ?disabled=${this.managing}
                                  @click=${this._confirmDeleteGroup}
                                >
                                  Delete group
                                </button>
                              </div>
                            </div>
                          `:q`
                            <button
                              type="button"
                              class="delete-group-btn link"
                              ?disabled=${this.managing}
                              @click=${this._startDeleteGroup}
                            >
                              Delete this group
                            </button>
                          `}
                    </div>
                  `:W}
            `:W}
      </div>
    `}_startDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!0)}_cancelDeleteGroup(){this._confirmingDeleteGroup=!1}_confirmDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("delete-group",{bubbles:!0,composed:!0})))}}ui.styles=a`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .legend-panel {
      border-radius: 12px;
      padding: 4px 0;
      background: transparent;
      border: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      /* Every list is height-bounded, not just 20+ groups: the list scrolls
         inside this supporting surface so it can never push save/undo/cancel
         out of reach (DESIGN.md, Legend). Short lists never hit the cap. */
      --curve-legend-max-height: min(52vh, 520px);
    }
    .legend-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 10px 4px;
    }
    .legend-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--secondary-text-color, #616161);
    }
    .legend-count {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 500;
      color: var(--secondary-text-color, #616161);
      opacity: 0.72;
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-height: var(--curve-legend-max-height, none);
      overflow: auto;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      /* Vertical padding lives on the stretched select button, not the row,
         so the whole visible row height is tappable. */
      padding: 0 10px;
      border-radius: 0;
      border-top: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      transition:
        background 0.15s ease,
        opacity 0.2s ease;
      font-size: var(--text-md, 13px);
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      position: relative;
      min-height: 58px;
      box-sizing: border-box;
    }
    .legend-panel.large-group .legend-item {
      min-height: 56px;
    }
    .row-select-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      /* Stretch to the row's full height: the visible row is the touch
         target, with no dead zones above or below the text. */
      align-self: stretch;
      padding: 0;
      margin: 0;
      border: none;
      background: transparent;
      font: inherit;
      font-weight: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row-select-btn:focus {
      outline: none;
    }
    .row-select-btn:focus-visible {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #2563eb) 50%, transparent);
      border-radius: 6px;
    }
    .legend-item:hover {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 5%, transparent);
    }
    .legend-item.hidden {
      opacity: 0.4;
    }
    .legend-item.selected {
      background: transparent;
    }
    .legend-item.selected::after {
      content: '';
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: 0;
      height: 2px;
      border-radius: 999px;
      background: var(--accent-color, var(--primary-color, #2563eb));
      pointer-events: none;
    }
    .legend-item.selected:hover {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 4%, transparent);
    }
    .color-dot {
      width: 10px;
      height: 10px;
      flex-shrink: 0;
    }
    .color-dot.shape-circle {
      border-radius: 50%;
    }
    .color-dot.shape-square {
      border-radius: 2px;
    }
    .color-dot.shape-diamond {
      border-radius: 2px;
      transform: rotate(45deg);
      width: 9px;
      height: 9px;
    }
    .color-dot.shape-triangle {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 10px solid var(--dot-color);
      background: transparent !important;
    }
    .color-dot.shape-bar {
      border-radius: 2px;
      width: 10px;
      height: 6px;
      margin: 2px 0;
    }
    .eye-btn {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.9;
      transition:
        opacity 0.15s ease,
        background 0.15s ease;
      padding: 14px;
      box-sizing: content-box;
      /* Explicit color + a resting chip: inherit-at-partial-opacity left this
         control effectively invisible, and touch has no hover to reveal it. */
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 8%, transparent);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color, #616161);
      border-radius: 8px;
    }
    .eye-btn svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .legend-item:hover .eye-btn,
    .legend-item.hidden .eye-btn {
      opacity: 1;
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 14%, transparent);
    }
    .eye-btn:focus {
      outline: none;
    }
    .eye-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      opacity: 0.9;
    }
    .name-block {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      min-width: 0;
      gap: 1px;
      min-height: 38px;
    }
    .name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .entity-id {
      display: block;
      font-size: 10px;
      font-weight: 400;
      color: var(--secondary-text-color, #757575);
      opacity: 0.7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      height: 14px;
      line-height: 14px;
      transition: opacity 0.15s ease;
    }
    .legend-item:not(.selected):not(:hover):not(:focus-within) .entity-id {
      opacity: 0;
    }
    .brightness-value {
      font-size: 11px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color, #616161);
      flex-shrink: 0;
      /* Reserve space for "100%" so the badge never auto-shrinks/grows
         and never clips a 3-digit value (Bubble #2138). */
      min-width: 36px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }
    .add-divider {
      height: 1px;
      margin: 6px 10px;
      background: var(--divider);
    }
    .add-row {
      padding: 6px 10px 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .delete-group-row {
      padding: 4px 10px 10px;
      border-top: 1px dashed var(--divider);
      margin-top: 2px;
    }
    .delete-group-btn {
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .delete-group-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .delete-group-btn.link {
      background: transparent;
      border: none;
      color: var(--error-color, #db4437);
      min-height: 44px;
      padding: 10px 0;
      text-align: left;
      width: 100%;
    }
    .delete-group-btn.link:hover:not(:disabled) {
      text-decoration: underline;
    }
    .delete-group-confirm {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .delete-group-text {
      font-size: 12px;
      color: var(--primary-text-color, #212121);
      font-weight: 500;
    }
    .delete-group-actions {
      display: flex;
      gap: 6px;
    }
    .delete-group-btn.cancel {
      background: transparent;
      border: 1px solid var(--divider);
      color: var(--secondary-text-color, #616161);
    }
    .delete-group-btn.cancel:hover:not(:disabled) {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
    }
    .delete-group-btn.danger {
      background: var(--error-color, #db4437);
      border: 1px solid var(--error-color, #db4437);
      color: #fff;
      font-weight: 600;
    }
    .delete-group-btn.danger:hover:not(:disabled) {
      opacity: 0.9;
    }
    .add-light-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      background: var(--primary-color, #2563eb);
      border: 1px solid var(--primary-color, #2563eb);
      border-radius: 8px;
      color: #fff;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      /* Shares the add-row with the quiet remove toggle; both stay one
         physical row so remove never reads as a stray wrapped button. */
      flex: 1;
      min-width: 0;
      transition: opacity 0.15s ease;
    }
    .add-light-btn:hover:not(:disabled) {
      opacity: 0.9;
    }
    .add-light-btn:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    .add-light-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .add-light-btn svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .pending-light-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 58px;
      padding: 8px 10px;
      border-top: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      background: color-mix(in srgb, var(--primary-color, #2563eb) 4%, transparent);
      box-sizing: border-box;
    }
    .pending-light-picker {
      flex: 1;
      min-width: 0;
    }
    .pending-light-picker ha-entity-picker,
    .pending-light-picker input[type='text'] {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
    .pending-light-picker input[type='text'] {
      padding: 6px 10px;
      border: 1px solid var(--divider);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
    }
    .pending-light-picker input[type='text']:focus {
      outline: none;
      border-color: var(--primary-color, #2563eb);
      box-shadow: 0 0 0 1px var(--primary-color, #2563eb);
    }
    .pending-row-action {
      width: 32px;
      height: 32px;
      flex: 0 0 32px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
    }
    .pending-row-action:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      color: var(--primary-color, #2563eb);
    }
    .pending-row-action:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    .pending-row-action:disabled {
      cursor: wait;
      opacity: 0.6;
    }
    .pending-row-action svg {
      width: 17px;
      height: 17px;
    }
    .managing-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 10px;
      color: var(--secondary-text-color, #616161);
      font-size: 12px;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--secondary-text-color, #616161) 30%, transparent);
      border-top-color: var(--primary-color, #2563eb);
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media ${Ne} {
      .legend-item {
        padding: 0 10px;
        font-size: 14px;
        min-height: 44px;
        box-sizing: border-box;
      }
      .eye-btn {
        width: 44px;
        height: 44px;
        padding: 12px;
        margin-left: auto;
        box-sizing: border-box;
      }
      .eye-btn svg {
        width: 20px;
        height: 20px;
      }
    }
  `,ui._shapes=Gt,t([gt({type:Array})],ui.prototype,"curves",void 0),t([gt({type:String})],ui.prototype,"selectedCurveId",void 0),t([gt({attribute:!1})],ui.prototype,"exampleEntityId",void 0),t([gt({type:Number})],ui.prototype,"scrubberPosition",void 0),t([gt({type:Boolean})],ui.prototype,"canManage",void 0),t([gt({type:Boolean})],ui.prototype,"managing",void 0),t([_t()],ui.prototype,"_confirmingDeleteGroup",void 0),ke("curve-legend",ui);class gi extends dt{constructor(){super(...arguments),this.dirty=!1,this.readOnly=!1,this.saving=!1,this.canUndo=!1}_onSave(){this.dispatchEvent(new CustomEvent("save-curves",{bubbles:!0,composed:!0}))}_onCancel(){this.dispatchEvent(new CustomEvent("cancel-curves",{bubbles:!0,composed:!0}))}_onUndo(){this.dispatchEvent(new CustomEvent("undo-curves",{bubbles:!0,composed:!0}))}render(){return this.readOnly?q`
        <div class="footer">
          <div class="read-only">
            <svg
              class="lock-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            View only
          </div>
        </div>
      `:this.dirty||this.canUndo?q`
      <div class="footer">
        ${this.canUndo?q`
              <button
                class="btn-ghost btn-undo"
                @click=${this._onUndo}
                ?disabled=${this.saving}
                aria-label="Undo"
              >
                <svg
                  class="undo-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Undo
              </button>
            `:q`<span class="unsaved-label">Unsaved changes</span>`}
        <button
          class="btn-ghost"
          @click=${this._onCancel}
          ?disabled=${this.saving}
          aria-label="Cancel changes (Esc)"
        >
          Cancel
        </button>
        <button
          class="btn-save"
          @click=${this._onSave}
          ?disabled=${this.saving}
          aria-label="Save changes (Ctrl+S)"
        >
          ${this.saving?vt.footer.saving:vt.footer.save}
        </button>
      </div>
    `:q``}}gi.styles=a`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 0 0;
      min-height: 36px;
    }
    .read-only {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-sm, 12px);
      color: var(--secondary-text, #616161);
      margin-right: auto;
    }
    .lock-icon {
      width: 14px;
      height: 14px;
      opacity: 0.6;
    }
    .unsaved-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--warning-color, #b45309);
      margin-right: auto;
    }
    button {
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      padding: 7px 16px;
      cursor: pointer;
      transition:
        background 0.15s ease,
        opacity 0.15s ease;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .btn-save {
      background: var(--accent);
      color: #fff;
    }
    .btn-save:hover:not(:disabled) {
      background: color-mix(in srgb, var(--accent) 85%, #000);
    }
    .btn-ghost {
      background: transparent;
      color: var(--secondary-text, #616161);
      border: 1px solid var(--divider);
    }
    .btn-ghost:hover:not(:disabled) {
      background: rgba(128, 128, 128, 0.08);
    }
    .btn-undo {
      padding: 7px 10px;
      margin-right: auto;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .undo-icon {
      width: 14px;
      height: 14px;
    }
    @media ${Ne} {
      .footer {
        min-height: 48px;
      }
      button {
        padding: 12px 20px;
        font-size: 14px;
        min-height: 44px;
      }
    }
  `,t([gt({type:Boolean})],gi.prototype,"dirty",void 0),t([gt({type:Boolean})],gi.prototype,"readOnly",void 0),t([gt({type:Boolean})],gi.prototype,"saving",void 0),t([gt({type:Boolean})],gi.prototype,"canUndo",void 0),ke("curve-footer",gi);const _i=(t,e,i)=>{const r=new Map;for(let s=e;s<=i;s++)r.set(t[s],s);return r},vi=Je(class extends Ze{constructor(t){if(super(t),t.type!==Ye)throw Error("repeat() can only be used in text expressions")}dt(t,e,i){let r;void 0===i?i=e:void 0!==e&&(r=e);const s=[],n=[];let o=0;for(const e of t)s[o]=r?r(e,o):o,n[o]=i(e,o),o++;return{values:n,keys:s}}render(t,e,i){return this.dt(t,e,i).values}update(t,[e,i,r]){const s=(t=>t._$AH)(t),{values:n,keys:o}=this.dt(e,i,r);if(!Array.isArray(s))return this.ut=o,n;const a=this.ut??=[],l=[];let h,d,c=0,p=s.length-1,u=0,g=n.length-1;for(;c<=p&&u<=g;)if(null===s[c])c++;else if(null===s[p])p--;else if(a[c]===o[u])l[u]=ri(s[c],n[u]),c++,u++;else if(a[p]===o[g])l[g]=ri(s[p],n[g]),p--,g--;else if(a[c]===o[g])l[g]=ri(s[c],n[g]),ii(t,l[g+1],s[c]),c++,g--;else if(a[p]===o[u])l[u]=ri(s[p],n[u]),ii(t,s[c],s[p]),p--,u++;else if(void 0===h&&(h=_i(o,u,g),d=_i(a,c,p)),h.has(a[c]))if(h.has(a[p])){const e=d.get(o[u]),i=void 0!==e?s[e]:null;if(null===i){const e=ii(t,s[c]);ri(e,n[u]),l[u]=e}else l[u]=ri(i,n[u]),ii(t,s[c],i),s[e]=null;u++}else oi(s[p]),p--;else oi(s[c]),c++;for(;u<=g;){const e=ii(t,l[g+1]);ri(e,n[u]),l[u++]=e}for(;c<=p;){const t=s[c++];null!==t&&oi(t)}return this.ut=o,ni(t,l),K}}),mi="[Lightener] Unsupported or malformed candidate_state_metadata. Expected v1 with boolean hidden, disabled, and missing on every light; using the legacy all-visible view.";function yi(t){return"object"==typeof t&&null!==t&&!Array.isArray(t)}function bi(t){return"string"==typeof t?t:null}function fi(t,e){if(!yi(t))throw new Error(`Invalid candidate response: lights[${e}] must be an object`);const i=function(t,e){if("string"!=typeof t)throw new Error(`Invalid candidate response: ${e} must be a string`);return t}(t.entity_id,`lights[${e}].entity_id`);return{entity_id:i,name:"string"==typeof t.name?t.name:i,available:"boolean"==typeof t.available&&t.available,area_id:bi(t.area_id),area_name:bi(t.area_name)}}function xi(t){if(!yi(t))throw new Error("Invalid candidate response: expected an object");if(!Array.isArray(t.observed_controlled_entity_ids))throw new Error("Invalid candidate response: observed_controlled_entity_ids must be an array");if(!t.observed_controlled_entity_ids.every(t=>"string"==typeof t))throw new Error("Invalid candidate response: observed_controlled_entity_ids must contain strings");if(!Array.isArray(t.lights))throw new Error("Invalid candidate response: lights must be an array");const e=t.lights,i=e.map(fi),r=t.capabilities;let s="legacy",n=null;if(void 0!==r)if(yi(r)){if(o=r,a="candidate_state_metadata",Object.prototype.hasOwnProperty.call(o,a))if(1!==r.candidate_state_metadata)n=mi;else{e.every(t=>yi(t)&&"boolean"==typeof t.hidden&&"boolean"==typeof t.disabled&&"boolean"==typeof t.missing)?s="v1":n=mi}}else n=mi;var o,a;const l=i.map((t,i)=>{if("legacy"===s)return{...t,hidden:!1,disabled:!1,missing:!1};const r=e[i];return{...t,hidden:r.hidden,disabled:r.disabled,missing:r.missing}});return{observedControlledEntityIds:[...t.observed_controlled_entity_ids],lights:l,metadataMode:s,metadataWarning:n}}class wi extends dt{constructor(){super(...arguments),this.hass=null,this.groupEntityId="",this._lights=[],this._observedOrder=[],this._pendingSelectedIds=new Set,this._metadataMode="legacy",this._search="",this._areaId="",this._currentGroupOnly=!1,this._showExceptional=!1,this._loading=!0,this._applying=!1,this._loadError=null,this._applyError=null,this._applyErrorCode=null,this._announcedResultSummary="",this._initialMemberIds=new Set,this._candidateOrder=[],this._loadInFlight=!1,this._loaded=!1,this._loadSerial=0,this._metadataWarningEmitted=!1,this._resultAnnouncementTimer=null,this._areaOptions=[],this._boundKeydown=t=>this._onKeydown(t)}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this._boundKeydown),this.hasUpdated&&this._loadIfReady()}disconnectedCallback(){this._loadSerial+=1,this._loadInFlight=!1,this._loaded||(this._loading=!1),this._clearResultAnnouncementTimer(),document.removeEventListener("keydown",this._boundKeydown),super.disconnectedCallback()}firstUpdated(){const t=this.renderRoot.querySelector(".load-error");if(t)return void t.focus();const e=this.renderRoot.querySelector("#membership-search");e&&!e.disabled?e.focus():this.renderRoot.querySelector("#membership-title")?.focus()}willUpdate(t){const e=t.has("groupEntityId")&&t.get("groupEntityId")!==this.groupEntityId,i=t.has("hass")&&!this.hass||t.has("groupEntityId")&&!this.groupEntityId;(e||i)&&this._resetForGroup()}updated(t){(t.has("hass")||t.has("groupEntityId"))&&this._loadIfReady(),(t.has("_lights")||t.has("_pendingSelectedIds")||t.has("_search")||t.has("_areaId")||t.has("_currentGroupOnly")||t.has("_showExceptional")||t.has("_loaded")||t.has("_loadError"))&&this._scheduleResultAnnouncement()}_resetForGroup(){this._loadSerial+=1,this._loadInFlight=!1,this._loaded=!1,this._lights=[],this._observedOrder=[],this._initialMemberIds=new Set,this._pendingSelectedIds=new Set,this._candidateOrder=[],this._areaOptions=[],this._metadataMode="legacy",this._search="",this._areaId="",this._currentGroupOnly=!1,this._showExceptional=!1,this._loading=!0,this._applying=!1,this._loadError=null,this._applyError=null,this._applyErrorCode=null,this._announcedResultSummary="",this._clearResultAnnouncementTimer(),this.hass&&this.groupEntityId||(this._loading=!1)}_loadIfReady(){this.isConnected&&this.hass&&this.groupEntityId&&!this._loadInFlight&&!this._loaded&&!this._loadError&&this._load()}async _load(){if(!this.hass||!this.groupEntityId||this._loadInFlight)return;const t=this.hass,e=this.groupEntityId,i=++this._loadSerial;this._loadInFlight=!0,this._loading=!0,this._loadError=null,this._applyError=null,this._applyErrorCode=null;try{let r,s;try{r=await t.callWS({type:"lightener/list_candidate_lights",entity_id:e})}catch(t){return void(i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"request"))}if(i!==this._loadSerial||e!==this.groupEntityId)return;try{s=xi(r)}catch(t){return void(i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"response"))}s.metadataWarning&&!this._metadataWarningEmitted&&(this._metadataWarningEmitted=!0,console.warn(s.metadataWarning)),this._initialMemberIds=new Set(s.observedControlledEntityIds),this._candidateOrder=s.lights.map(t=>t.entity_id),this._lights=function(t,e,i){const r=new Intl.Collator(i,{sensitivity:"base",numeric:!0});return[...t].sort((t,i)=>{const s=e.has(t.entity_id);return s!==e.has(i.entity_id)?s?-1:1:r.compare(t.name,i.name)||r.compare(t.entity_id,i.entity_id)})}(s.lights,this._initialMemberIds,t.locale?.language),this._observedOrder=s.observedControlledEntityIds,this._pendingSelectedIds=new Set(s.observedControlledEntityIds),this._metadataMode=s.metadataMode,this._rebuildAreaOptions(),this._loaded=!0,this._loadError=null,this._loading=!1,this._afterNextRender("focus the loaded membership dialog",()=>{if(i!==this._loadSerial||e!==this.groupEntityId)return;const t=this.renderRoot.querySelector("#membership-title"),r=this.shadowRoot?.activeElement??null;null!==r&&r!==t||this._focusOrHeading(this.renderRoot.querySelector("#membership-search"))})}catch(t){i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"process")}finally{i===this._loadSerial&&(this._loadInFlight=!1,this._loading=!1)}}_setLoadFailure(t,e){console.error(`[Lightener] Failed to ${e} candidate lights:`,t),this._loaded=!1,this._loadError=vt.membership.loadError,this._loading=!1,this._afterNextRender("focus the membership load error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".load-error"))})}_afterNextRender(t,e){this.updateComplete.then(e).catch(e=>{console.error(`[Lightener] Failed to ${t}:`,e)})}_retryLoad(){this._loadInFlight||this._applying||!this._loadError||(this._loaded=!1,this._loadError=null,this._loadIfReady())}_errorMessage(t,e){const i=t,r="string"==typeof i?.message&&i.message?i.message:null;return"conflict"===i?.code?vt.membership.conflictError:"disabled_entity"===i?.code?r??vt.membership.disabledError:"reload_failed"===i?.code?vt.membership.reloadError:"rollback_reload_failed"===i?.code?vt.membership.rollbackError:r??e}get _groupName(){return this.hass?.states[this.groupEntityId]?.attributes.friendly_name??this.groupEntityId}_isExceptional(t){return"v1"===this._metadataMode&&(t.hidden||t.disabled)}_matchesSearchAndArea(t,e){return(!this._areaId||t.area_id===this._areaId)&&!(e&&!t.name.toLocaleLowerCase().includes(e)&&!t.entity_id.toLocaleLowerCase().includes(e))}_matchesScopeAndDiscovery(t,e){return(!this._currentGroupOnly||this._initialMemberIds.has(t.entity_id))&&this._matchesSearchAndArea(t,e)}_isSuppressedExceptional(t){return this._isExceptional(t)&&!this._initialMemberIds.has(t.entity_id)&&!this._pendingSelectedIds.has(t.entity_id)}_computeView(){const t=this._search.trim().toLocaleLowerCase(),e=[];let i=0,r=0;for(const s of this._lights){if(!this._matchesScopeAndDiscovery(s,t))continue;const n=this._isSuppressedExceptional(s);n&&(r+=1),!this._showExceptional&&n||(e.push(s),this._pendingSelectedIds.has(s.entity_id)&&(i+=1))}return{visible:e,visibleSelected:i,exceptionalCount:r}}get _areas(){return this._areaOptions}_rebuildAreaOptions(){const t=new Map;for(const e of this._lights)e.area_id&&e.area_name&&t.set(e.area_id,e.area_name);const e=new Intl.Collator(this.hass?.locale?.language,{sensitivity:"base"});this._areaOptions=[...t].map(([t,e])=>({id:t,name:e})).sort((t,i)=>e.compare(t.name,i.name))}get _hasChanges(){return this._pendingSelectedIds.size!==this._observedOrder.length||this._observedOrder.some(t=>!this._pendingSelectedIds.has(t))}get _applyBlockedByConflict(){return"conflict"===this._applyErrorCode}_statuses(t){const e=[];return t.hidden&&e.push(vt.membership.hidden),t.disabled&&e.push(vt.membership.disabled),t.missing?e.push(vt.membership.missing):t.available||t.disabled||e.push(vt.membership.unavailable),e}_isNewDisabled(t){return t.disabled&&!this._initialMemberIds.has(t.entity_id)}_toggle(t){if(this._applying||this._isNewDisabled(t))return;const e=new Set(this._pendingSelectedIds),i=e.has(t.entity_id);i?e.delete(t.entity_id):e.add(t.entity_id);const r=i&&!this._showExceptional&&this._isExceptional(t)&&!this._initialMemberIds.has(t.entity_id);this._pendingSelectedIds=e,this._applyBlockedByConflict||(this._applyError=null,this._applyErrorCode=null),r&&this._afterNextRender("restore focus after hiding an exceptional light",()=>{this._focusOrHeading(this.renderRoot.querySelector(".exceptional-filter"))})}_clearSearchAndArea(){this._search="",this._areaId="",this._afterNextRender("restore focus after clearing membership filters",()=>{this._focusOrHeading(this.renderRoot.querySelector("#membership-search"))})}_showAllLights(){this._currentGroupOnly=!1,this._afterNextRender("restore focus after showing all lights",()=>{this._focusOrHeading(this.renderRoot.querySelector(".light-row input:not(:disabled)"))})}_revealExceptional(){const t=this._search.trim().toLocaleLowerCase(),e=this._lights.find(e=>this._matchesScopeAndDiscovery(e,t)&&this._isSuppressedExceptional(e))?.entity_id;this._showExceptional=!0,this._afterNextRender("restore focus after revealing exceptional lights",()=>{const t=e?[...this.renderRoot.querySelectorAll("input[data-entity-id]")].find(t=>t.dataset.entityId===e&&!t.disabled):null;this._focusOrHeading(t??null)})}_focusOrHeading(t){t&&!t.matches(":disabled")&&(t.focus(),this.shadowRoot?.activeElement===t)||this.renderRoot.querySelector("#membership-title")?.focus()}_clearResultAnnouncementTimer(){null!==this._resultAnnouncementTimer&&(clearTimeout(this._resultAnnouncementTimer),this._resultAnnouncementTimer=null)}_scheduleResultAnnouncement(){if(this._clearResultAnnouncementTimer(),!this._loaded||this._loadError)return void(this._announcedResultSummary="");const{visible:t,visibleSelected:e}=this._computeView(),i=vt.membership.resultSummary(t.length,e,this._pendingSelectedIds.size);this._resultAnnouncementTimer=setTimeout(()=>{this._resultAnnouncementTimer=null,this.isConnected&&this._loaded&&!this._loadError&&(this._announcedResultSummary=i)},wi.RESULT_ANNOUNCEMENT_DELAY_MS)}_close(){this._applying||this.dispatchEvent(new CustomEvent("membership-close",{bubbles:!0,composed:!0}))}async _apply(){if(!this.hass||!this.groupEntityId||this._applying||this._loading||this._applyBlockedByConflict)return;if(0===this._pendingSelectedIds.size)return this._applyError=vt.membership.emptyError,void this._afterNextRender("focus the empty membership error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".apply-error"))});if(!this._hasChanges)return;this._applying=!0,this._applyError=null,this._applyErrorCode=null;let t=!1;try{const t=new Set(this._observedOrder),e=this._observedOrder.filter(t=>this._pendingSelectedIds.has(t));e.push(...this._candidateOrder.filter(e=>this._pendingSelectedIds.has(e)&&!t.has(e)));const i=await this.hass.callWS({type:"lightener/set_controlled_lights",entity_id:this.groupEntityId,controlled_entity_ids:e,observed_controlled_entity_ids:this._observedOrder});this.dispatchEvent(new CustomEvent("membership-applied",{detail:i,bubbles:!0,composed:!0}))}catch(e){t=!0,this._applyErrorCode="string"==typeof e?.code?e.code??null:null,this._applyError=this._errorMessage(e,vt.membership.applyError)}finally{this._applying=!1}t&&this._afterNextRender("focus the membership update error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".apply-error"))})}_onKeydown(t){if("Escape"===t.key)return void(this._applying||(t.preventDefault(),t.stopPropagation(),this._close()));if("Tab"!==t.key)return;const e=[...this.renderRoot.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")];if(0===e.length)return t.preventDefault(),void this.renderRoot.querySelector("#membership-title")?.focus();const i=e[0],r=e[e.length-1],s=this.shadowRoot?.activeElement??null;e.includes(s)?t.shiftKey&&s===i?(t.preventDefault(),r.focus()):t.shiftKey||s!==r||(t.preventDefault(),i.focus()):(t.preventDefault(),(t.shiftKey?r:i).focus())}_renderEmptyState(t){if(0===this._lights.length)return q`<div class="state-message">
        <div class="empty-copy">${vt.membership.sourceEmpty}</div>
      </div>`;const e=this._showExceptional?0:t.exceptionalCount;return e>0?q`<div class="state-message">
        <div class="empty-copy">${vt.membership.exceptionalEmpty(e)}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._revealExceptional}
        >
          ${vt.membership.showExceptionalAction}
        </button>
      </div>`:this._search.trim()||this._areaId?q`<div class="state-message">
        <div class="empty-copy">${vt.membership.filterEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._clearSearchAndArea}
        >
          ${vt.membership.clearFilters}
        </button>
      </div>`:this._currentGroupOnly?q`<div class="state-message">
        <div class="empty-copy">${vt.membership.scopeEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._showAllLights}
        >
          ${vt.membership.showAllLights}
        </button>
      </div>`:q`<div class="state-message">
      <div class="empty-copy">${vt.membership.filterEmpty}</div>
    </div>`}_renderList(t){if(this._loading)return q`<div class="state-message" role="status" aria-live="polite">
        <div class="loading-copy">${vt.membership.loading}</div>
        <div class="skeletons" aria-hidden="true">
          <div class="skeleton"></div>
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        </div>
      </div>`;if(this._loadError)return q`<div class="state-message">
        <div class="error load-error" role="alert" aria-live="assertive" tabindex="-1">
          ${this._loadError}
        </div>
        <button class="action" type="button" @click=${this._retryLoad}>
          ${vt.membership.tryAgain}
        </button>
      </div>`;const{visible:e}=t;return 0===e.length?this._renderEmptyState(t):q`${vi(e,t=>t.entity_id,t=>{const e=this._statuses(t),i=`membership-light-meta-${t.entity_id.replace(/[^a-zA-Z0-9_-]/g,"-")}`,r=this._isNewDisabled(t);return q`
          <label class="light-row ${r?"new-disabled":""}">
            <input
              type="checkbox"
              data-entity-id=${t.entity_id}
              .checked=${this._pendingSelectedIds.has(t.entity_id)}
              ?disabled=${this._applying||r}
              aria-label=${vt.membership.lightCheckboxLabel(t.name,e)}
              aria-describedby=${i}
              @change=${()=>this._toggle(t)}
            />
            <span>
              <span class="name">${t.name}</span>
              <span class="entity-id"
                ><span id=${i}>${t.entity_id}</span>${e.length>0?` · ${e.join(" · ")}`:""}</span
              >
            </span>
            ${t.area_name?q`<span class="area">${t.area_name}</span>`:W}
          </label>
        `})}`}render(){const t=this._computeView(),{visible:e,visibleSelected:i}=t,r=this._loading||this._applying||!this._loaded,s=this._loaded&&0===this._pendingSelectedIds.size;return q`
      <section
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-title"
        aria-describedby="membership-context"
        aria-busy=${this._applying?"true":"false"}
        @click=${t=>t.stopPropagation()}
      >
        <header>
          <div>
            <h2 id="membership-title" tabindex="-1">${vt.membership.title}</h2>
            <p id="membership-context">
              <span class="group-name">${this._groupName}</span>
              <span aria-hidden="true"> · </span>${vt.membership.subtitle}
            </p>
          </div>
          <button
            class="close"
            type="button"
            aria-label=${vt.membership.close}
            ?disabled=${this._applying}
            @click=${this._close}
          >
            ×
          </button>
        </header>

        <div class="controls">
          <div class="filters">
            <label class="field">
              <span class="field-label">${vt.membership.search}</span>
              <input
                id="membership-search"
                type="search"
                placeholder=${vt.membership.searchPlaceholder}
                .value=${this._search}
                ?disabled=${r}
                @input=${t=>{this._search=t.target.value}}
              />
            </label>
            <label class="field">
              <span class="field-label">${vt.membership.areaFilter}</span>
              <select
                .value=${this._areaId}
                ?disabled=${r}
                @change=${t=>{this._areaId=t.target.value}}
              >
                <option value="">${vt.membership.allAreas}</option>
                ${this._areas.map(t=>q`<option value=${t.id}>${t.name}</option>`)}
              </select>
            </label>
          </div>

          <div class="scope-filters">
            ${this._loaded?q`<label class="scope-option">
                  <input
                    class="current-group-filter"
                    type="checkbox"
                    .checked=${this._currentGroupOnly}
                    ?disabled=${r}
                    @change=${t=>{this._currentGroupOnly=t.target.checked}}
                  />
                  <span>${vt.membership.currentGroupOnly(this._initialMemberIds.size)}</span>
                </label>`:W}
            ${this._loaded&&"v1"===this._metadataMode?q`<label class="scope-option">
                  <input
                    class="exceptional-filter"
                    type="checkbox"
                    .checked=${this._showExceptional}
                    ?disabled=${r}
                    @change=${t=>{this._showExceptional=t.target.checked}}
                  />
                  <span>${vt.membership.showExceptional(t.exceptionalCount)}</span>
                </label>`:W}
          </div>

          ${this._loaded&&!this._loadError?q`<div class="result-summary">
                  ${vt.membership.resultSummary(e.length,i,this._pendingSelectedIds.size)}
                </div>
                <span
                  class="sr-only result-announcement"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  >${this._announcedResultSummary}</span
                >`:q`<div class="result-summary" aria-hidden="true"></div>`}
        </div>

        <div
          class="list"
          role="region"
          aria-label=${vt.membership.candidateList}
          aria-busy=${this._loading?"true":"false"}
        >
          ${this._renderList(t)}
        </div>

        <footer>
          ${this._applyError?q`<div class="error apply-error" role="alert" aria-live="assertive" tabindex="-1">
                ${this._applyError}
              </div>`:s?q`<div class="error selection-error" role="status">
                  ${vt.membership.emptyError}
                </div>`:W}
          ${this._applying?q`<span class="sr-only applying-status" role="status" aria-live="polite"
                >${vt.membership.applyingStatus}</span
              >`:W}
          <span class="count">${vt.membership.selectedCount(this._pendingSelectedIds.size)}</span>
          <button class="action" type="button" ?disabled=${this._applying} @click=${this._close}>
            ${vt.membership.cancel}
          </button>
          <button
            class="action primary"
            type="button"
            ?disabled=${r||s||!this._hasChanges||this._applyBlockedByConflict}
            @click=${this._apply}
          >
            ${this._applying?vt.membership.applying:this._applyError&&!this._applyBlockedByConflict?vt.membership.tryAgain:vt.membership.apply}
          </button>
        </footer>
      </section>
    `}}wi.RESULT_ANNOUNCEMENT_DELAY_MS=250,wi.styles=a`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 20px;
      box-sizing: border-box;
      background: rgb(10 15 18 / 0.58);
      color: var(--primary-text-color, #20252a);
    }
    .dialog {
      width: min(600px, 100%);
      max-height: min(760px, calc(100vh - 40px));
      display: grid;
      grid-template-rows: auto auto minmax(96px, 1fr) auto;
      overflow: hidden;
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      box-shadow: 0 24px 70px rgb(0 0 0 / 0.34);
    }
    header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 22px 15px;
      border-bottom: 1px solid var(--divider-color, #e2e6e9);
    }
    h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
      letter-spacing: 0;
    }
    header p {
      margin: 6px 0 0;
      color: var(--secondary-text-color, #66717b);
      font-size: 13px;
      line-height: 1.45;
    }
    .group-name {
      color: var(--primary-text-color, #20252a);
      font-weight: 650;
    }
    .close {
      width: 44px;
      height: 44px;
      margin: -3px -5px -3px auto;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: 24px/1 sans-serif;
      cursor: pointer;
    }
    .close:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
    }
    .controls {
      display: grid;
      gap: 10px;
      padding: 14px 22px;
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.45fr);
      gap: 10px;
    }
    .field {
      display: grid;
      gap: 5px;
      min-width: 0;
    }
    .field-label {
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
      font-weight: 650;
    }
    input[type='search'],
    select {
      width: 100%;
      height: 44px;
      box-sizing: border-box;
      border: 1px solid var(--divider-color, #d7dde1);
      border-radius: 6px;
      padding: 0 12px;
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
    }
    input:focus,
    select:focus,
    button:focus-visible {
      outline: 2px solid var(--primary-color, #1590ad);
      outline-offset: 2px;
    }
    .scope-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
    }
    .scope-option {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      box-sizing: border-box;
      color: var(--primary-text-color, #20252a);
      font-size: 13px;
      cursor: pointer;
    }
    .scope-option input,
    .light-row input {
      width: 18px;
      height: 18px;
      flex: 0 0 auto;
      accent-color: var(--primary-color, #1590ad);
    }
    .result-summary {
      min-height: 18px;
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
    }
    .list {
      overflow: auto;
      border-block: 1px solid var(--divider-color, #e2e6e9);
    }
    .light-row {
      min-height: 56px;
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 8px 22px;
      box-sizing: border-box;
      border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 68%, transparent);
      cursor: pointer;
    }
    .light-row:hover:not(.new-disabled) {
      background: color-mix(in srgb, var(--primary-color, #1590ad) 6%, transparent);
    }
    .light-row.new-disabled {
      cursor: default;
    }
    .name,
    .entity-id {
      display: block;
      min-width: 0;
      overflow-wrap: anywhere;
      letter-spacing: 0;
    }
    .name {
      font-weight: 600;
      font-size: 14px;
    }
    .entity-id,
    .area,
    .empty-copy,
    .loading-copy {
      color: var(--secondary-text-color, #66717b);
      font-size: 12px;
    }
    .area {
      max-width: 150px;
      text-align: right;
    }
    .state-message {
      min-height: 96px;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 12px;
      padding: 24px 22px;
      box-sizing: border-box;
      text-align: center;
    }
    .skeletons {
      width: min(320px, 80vw);
      display: grid;
      gap: 8px;
    }
    .skeleton {
      height: 12px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--secondary-text-color, #66717b) 14%, transparent);
    }
    .skeleton:nth-child(2) {
      width: 84%;
    }
    .skeleton:nth-child(3) {
      width: 70%;
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 14px 22px 18px;
    }
    .count {
      margin-right: auto;
      color: var(--secondary-text-color, #66717b);
      font-size: 13px;
    }
    .error {
      color: var(--error-color, #b3261e);
      font-size: 13px;
    }
    footer .error {
      flex-basis: 100%;
      margin-bottom: 4px;
    }
    .action {
      min-height: 44px;
      padding: 0 16px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, #d7dde1);
      background: transparent;
      color: inherit;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .action.primary {
      border-color: var(--primary-color, #1590ad);
      background: var(--primary-color, #1590ad);
      color: #fff;
    }
    button:disabled,
    input:disabled,
    select:disabled {
      opacity: 0.58;
      cursor: default;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (max-width: 620px) {
      :host {
        padding: 0;
        place-items: stretch;
      }
      .dialog {
        width: 100%;
        max-height: none;
        height: 100%;
        border-radius: 0;
      }
      header {
        padding-top: calc(17px + env(safe-area-inset-top));
      }
      .filters {
        grid-template-columns: 1fr;
      }
      .scope-option {
        width: 100%;
      }
      .light-row {
        grid-template-columns: 24px minmax(0, 1fr);
        padding-inline: 16px;
      }
      .area {
        grid-column: 2;
        max-width: none;
        text-align: left;
      }
      footer {
        padding-right: calc(16px + env(safe-area-inset-right));
        padding-bottom: calc(14px + env(safe-area-inset-bottom));
        padding-left: calc(16px + env(safe-area-inset-left));
      }
      .count {
        flex-basis: 100%;
      }
    }
    @media (max-height: 420px) {
      header {
        padding-block: 10px 8px;
      }
      header p {
        margin-top: 3px;
      }
      .controls {
        gap: 4px;
        padding-block: 7px;
      }
      footer {
        padding-block: 7px;
      }
    }
  `,t([gt({attribute:!1})],wi.prototype,"hass",void 0),t([gt({type:String})],wi.prototype,"groupEntityId",void 0),t([_t()],wi.prototype,"_lights",void 0),t([_t()],wi.prototype,"_observedOrder",void 0),t([_t()],wi.prototype,"_pendingSelectedIds",void 0),t([_t()],wi.prototype,"_metadataMode",void 0),t([_t()],wi.prototype,"_search",void 0),t([_t()],wi.prototype,"_areaId",void 0),t([_t()],wi.prototype,"_currentGroupOnly",void 0),t([_t()],wi.prototype,"_showExceptional",void 0),t([_t()],wi.prototype,"_loading",void 0),t([_t()],wi.prototype,"_applying",void 0),t([_t()],wi.prototype,"_loadError",void 0),t([_t()],wi.prototype,"_applyError",void 0),t([_t()],wi.prototype,"_applyErrorCode",void 0),t([_t()],wi.prototype,"_announcedResultSummary",void 0),ke("light-membership-dialog",wi);"undefined"!=typeof window&&(function(){const t=globalThis.CSS;if(t?.registerProperty)try{t.registerProperty({name:"--curve-graph-max-height",syntax:"<length-percentage>",inherits:!0,initialValue:"320px"})}catch{}}(),window.__LIGHTENER_CURVE_CARD_VERSION__="2.18.0",function(t,e){if(void 0===t.customCards&&(t.customCards=[]),!Array.isArray(t.customCards))return;const i=t.customCards;i.some(t=>t?.type===e.type)||i.push(e)}(window,{type:we,name:"Lightener Studio",description:"Shape how each light responds to group brightness.",documentationURL:"https://github.com/florianhorner/lightener-studio#readme",preview:!0,getEntitySuggestion:function(t,e){return Ie(t,e)?{config:{type:$e,entity:e}}:null}}));const $i=q`<svg
  class="status-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path
    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  ></path>
  <line x1="12" y1="9" x2="12" y2="13"></line>
  <line x1="12" y1="17" x2="12.01" y2="17"></line>
</svg>`;const Ii=["light"];class ki extends dt{constructor(){super(...arguments),this._config={},this._hass=null,this._picker=new Se(()=>this.isConnected,()=>this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._picker.ensureLoaded()}setConfig(t){this._config=t,this._picker.ensureLoaded()}set hass(t){this._hass=t,this._picker.ensureLoaded()}_fireConfigChanged(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_commitConfigKey(t,e){const i=Object.fromEntries(Object.entries(this._config).filter(([e])=>e!==t));this._config=e?{...i,[t]:e}:i,this._fireConfigChanged()}_onEntityChange(t){this._commitConfigKey("entity",t.detail?.value??"")}_onTitleChange(t){this._commitConfigKey("title",t.target.value)}_onFallbackEntityInput(t){this._commitConfigKey("entity",t.target.value.trim())}render(){const t=this._config.entity??"",e=this._config.title??"",i=this._hass?function(t){const e=t.entities;return e?Object.keys(e).filter(e=>Ie(t,e)):[]}(this._hass):[];return q`
      <div class="form">
        <div class="field">
          <label>Entity</label>
          ${function(t){return t.ready?q`<ha-entity-picker
      .hass=${t.hass}
      .value=${t.value}
      .includeDomains=${t.includeDomains}
      .includeEntities=${t.includeEntities}
      .excludeEntities=${t.excludeEntities??[]}
      allow-custom-entity
      aria-label=${t.ariaLabel??W}
      @value-changed=${t.onValueChanged}
    ></ha-entity-picker>`:"change"===(t.fallbackEvent??"input")?q`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??W}
        aria-label=${t.ariaLabel??W}
        @change=${t.onFallbackInput}
      />`:q`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??W}
        aria-label=${t.ariaLabel??W}
        @input=${t.onFallbackInput}
      />`}({ready:this._picker.ready,hass:this._hass,value:t,includeDomains:Ii,includeEntities:i.length?i:void 0,placeholder:"light.your_lightener_group",fallbackEvent:"change",onValueChanged:this._onEntityChange,onFallbackInput:this._onFallbackEntityInput})}
          ${this._picker.ready?q`<span class="hint"
                >Only Lightener groups are listed — pick one to shape its lights.</span
              >`:q`<span class="hint">
                Entity picker unavailable — enter the group entity ID manually (must start with
                <code>light.</code>).
              </span>`}
        </div>
        <div class="field">
          <label>Title (optional)</label>
          <input
            type="text"
            .value=${e}
            placeholder="Brightness shapes"
            @input=${this._onTitleChange}
          />
        </div>
      </div>
    `}}ki.styles=a`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #616161);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input {
      padding: 8px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-size: 14px;
      font-family: inherit;
    }
    input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent);
    }
    .hint {
      font-size: 11px;
      color: var(--secondary-text-color, #616161);
      opacity: 0.7;
    }
  `,t([_t()],ki.prototype,"_config",void 0),t([_t()],ki.prototype,"_hass",void 0),ke("lightener-curve-card-editor",ki);class Si extends dt{constructor(){super(...arguments),this.experimentalFirstUse=!1,this._invitation=new fe(()=>this.requestUpdate()),this._invitationAutoAllowed=!1,this._invitationVisible=!1,this._invitationGraph=null,this._invitationObserver=null,this._invitationStartTimer=null,this._invitationMotionUnsubscribe=null,this._invitationInput="mouse",this._invitationHintTimer=null,this._invitationEditHint=null,this._invitationTogether=!1,this._curves=[],this._originalCurves=[],this._config={},this._selectedCurveId=null,this._sessionStateInitialized=!1,this._saveState=qe,this._load=Ke,this._manageError=null,this._managingLights=!1,this._groupDeleted=!1,this._scrubberPosition=null,this._cancelAnimating=!1,this._joy=Ht,this._drawIn=null,this._drawInToken=0,this._drawInTimer=null,this._drawInWaitingForVisible=!1,this._unsubscribeDrawInMotion=null,this._boundStopDrawIn=t=>{"pointerdown"===t?.type&&this._drawInWaitingForVisible||this._stopDrawIn()},this._ripple=null,this._cancelRippleLoop=null,this._morphLine=null,this._hass=null,this._undoStack=[],this._dragUndoPushed=!1,this._dragActive=!1,this._boundKeyHandler=null,this._boundBeforeUnload=null,this._boundFooterOverlaySync=null,this._footerOverlayFrame=null,this._saveGuard=new Ve({dispatchSave:t=>this._dispatchSave(t),getSavePhase:()=>this._saveState.phase}),this._cancelAnimFrame=null,this._previewActive=!1,this._presetGraphTrial=null,this._pendingPresetGraphTrial=null,this._hoveredPresetGraphTrial=null,this._focusedPresetGraphTrial=null,this._membershipOpen=!1,this._membershipStatus=null,this._membershipStatusTimer=null,this._coach=new Fe({isReady:()=>this._load.loaded&&void 0!==this._selectedCurve,setTrial:t=>this._setPresetGraphTrial(t),clearTrial:()=>this._clearPresetGraphTrial(),requestUpdate:()=>this.requestUpdate()}),this._lastPresetPointerType=null,this._previewController=new Re({getHass:()=>this._hass,getCurves:()=>this._curves,getScrubberPosition:()=>this._effectiveScrubberPosition,setScrubberPosition:t=>{this._scrubberPosition=t},getStorageEntityId:()=>this._storageEntityId,persistScrubberPosition:(t,e)=>{this._writeStoredState(t,{scrubberPosition:e})},setPreviewActive:t=>{this._previewActive=t}}),this._lastEmittedDirtyState=!1,this._dirtyVersion=0,this._cleanVersion=0,this._onInvitationControl=t=>{this.experimentalFirstUse&&(t.composedPath().some(t=>t instanceof Element&&("curve-graph"===t.localName||t.classList.contains("invitation-dismiss")))||t instanceof KeyboardEvent&&["Tab","Shift","Escape"].includes(t.key)||this._dismissInvitation())},this._onInvitationVisibility=()=>{document.hidden&&this._dismissInvitation()},this._onGraphPointerDown=t=>{if(0!==t.button)return;const e=this._liveRipple;if(!e)return;const i=t.composedPath()[0]?.getAttribute?.("data-curve");null!=i&&this._curves[Number(i)]?.entityId===e.entityId&&this._stopRipple()},this._onPreviewToggle=()=>{this._dismissInvitation(),this._clearPresetGraphTrial(),this._previewActive?this._stopPreview():this._startPreview()},this._startPreview=()=>{this._previewController.start()},this._stopPreview=()=>{this._previewController.stop()},this._onDrawInWaiting=t=>{this._drawIn&&t.detail?.token===this._drawIn.token&&(this._drawInWaitingForVisible=!0,null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=null)},this._onDrawInStarted=t=>{this._drawIn&&t.detail?.token===this._drawIn.token&&(this._drawInWaitingForVisible=!1,null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=setTimeout(this._boundStopDrawIn,function(t){const e=Number.isFinite(t)?Math.max(0,Math.trunc(t)):0,i=jt+40*Math.max(0,e-1)+150;return Math.max(1200,i)}(t.detail.pointCount)))}}get _saving(){return"saving"===(t=this._saveState).phase||"confirming"===t.phase;var t}get _saveSuccess(){return"saved"===this._saveState.phase}get _saveError(){return"error"===(t=this._saveState).phase?t.message:null;var t}_dispatchSave(t){const e="confirming"===this._saveState.phase;this._saveState=function(t,e){switch(e.type){case"reset":return{phase:"idle"};case"dirty":return"idle"===t.phase?{phase:"dirty"}:t;case"save-start":return"saving"===t.phase||"confirming"===t.phase?t:{phase:"saving"};case"save-success":return"saving"!==t.phase?t:{phase:"confirming"};case"save-confirmed":return"confirming"!==t.phase?t:{phase:"saved"};case"save-error":return"saving"!==t.phase&&"confirming"!==t.phase?t:{phase:"error",message:e.message};case"save-clear":return"saved"===t.phase||"error"===t.phase?{phase:"idle"}:t}}(this._saveState,t),"save-start"===t.type&&"saving"===this._saveState.phase&&this._clearMembershipStatus(),"confirming"!==this._saveState.phase&&this._saveGuard.onLeaveConfirming(this._saveState.phase,e)}get _lastPreviewTime(){return this._previewController.lastPreviewTime}set _lastPreviewTime(t){this._previewController.lastPreviewTime=t}get _embedded(){return!0===this._config.embedded}static getConfigElement(){return document.createElement("lightener-curve-card-editor")}static getStubConfig(){return{type:$e}}setConfig(t){const e=t.entity!==this._config.entity;e&&this._dismissInvitation();const i=!0===t.firstRun;this._config=t,this._joy=function(t){if(null===t||"object"!=typeof t||Array.isArray(t))return Ht;const e=t,i={...Ht};for(const t of Nt){const r=e[t];"boolean"==typeof r&&(i[t]=r)}return Object.freeze(i)}(t.joy),!e&&this._joy.ripple||this._stopRipple(),!e&&this._joy.draw_in||this._stopDrawIn(),e?(this._clearMembershipStatus(),this._previewActive&&this._stopPreview(),this._setMembershipOpen(!1),this._dragActive=!1,this._load=function(t){return{...t,loaded:!1,loadedEntityId:void 0,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._groupDeleted=!1,this._clearPresetGraphTrial(),this._selectedCurveId=null,this._scrubberPosition=null,this._sessionStateInitialized=!1,this._undoStack=[],this._invitationAutoAllowed=!1,this._invitationEditHint=null,this._invitationTogether=!1,this._coach.configure(i&&!this.experimentalFirstUse,!0),this._cleanVersion=this._dirtyVersion,this._tryLoadCurves()):this._coach.configure(i&&!this.experimentalFirstUse,!1)}set hass(t){const e=!!this._hass;this._hass=t,e&&this._load.loaded||this._dragActive||this._tryLoadCurves()}getCardSize(){return 4}getGridOptions(){return{columns:12,rows:9,min_columns:6,min_rows:6}}get _isAdmin(){return this._hass?.user?.is_admin??!1}get _entityId(){return this._config.entity}get _storageEntityId(){return this._load.loadedEntityId??this._entityId}get _isDirty(){return this._dirtyVersion!==this._cleanVersion}get _membershipLocked(){return this._membershipOpen||this._managingLights}get _selectedCurve(){if(null!==this._selectedCurveId)return this._curves.find(t=>t.entityId===this._selectedCurveId)}get _canShowPresetGraphTrial(){return!(void 0===this._selectedCurve||this._saving||this._cancelAnimating||this._drawIn||this._membershipLocked||this._previewActive)}get _isShowingPresetGraphTrial(){return null!==this._presetGraphTrial&&this._canShowPresetGraphTrial&&this._liveRipple?.entityId!==this._selectedCurveId}get _graphCurves(){const t=this._invitation.curve;return t?this._curves.map(e=>e.entityId===t.entityId?t:e):this._curves}get _effectiveScrubberPosition(){return this._scrubberPosition??100}get _presetPreviewCurve(){const t=this._selectedCurve;if(!t?.visible)return null;const e=this._liveRipple,i=e?.entityId===t.entityId?e.committed:this._canShowPresetGraphTrial&&this._isShowingPresetGraphTrial?this._presetGraphTrial?.controlPoints:null;return i?{...t,controlPoints:[...i],visible:!0}:null}get _invitationTarget(){const t=t=>{const e=this._hass?.states[t.entityId]?.state;return t.visible&&void 0!==e&&"unavailable"!==e&&"unknown"!==e};return this._curves.find(e=>e.entityId===this._selectedCurveId&&t(e))??this._curves.find(t)}get _canRunInvitation(){const t=this._invitation.curve?this._selectedCurve:this._invitationTarget,e=this.renderRoot.querySelector("curve-graph"),i=t&&this._hass?.states[t.entityId]?.state;return this.experimentalFirstUse&&(!e?.interactionActive||!!this._invitation.curve)&&this.isConnected&&this._isAdmin&&this._load.loaded&&this._load.loadedEntityId===this._entityId&&!this._load.loading&&!this._load.loadError&&!this._groupDeleted&&!this._saving&&!this._saveSuccess&&!this._saveError&&!this._isDirty&&!this._cancelAnimating&&!this._membershipLocked&&!this._previewActive&&!this._drawIn&&!this._isShowingPresetGraphTrial&&!!t?.visible&&void 0!==i&&"unavailable"!==i&&"unknown"!==i}_startInvitation(t=!1){if(this._clearInvitationStartTimer(),this.renderRoot.querySelector("curve-graph")?.interactionActive)return;if(t&&!be(this._curves))return void(this._invitationAutoAllowed=!1);const e=this._invitationTarget;this._canRunInvitation&&e&&this._entityId&&(this._selectedCurveId=e.entityId,this._invitationAutoAllowed=!1,this._clearPresetGraphTrial(),this._coach.dismiss(),this._invitationEditHint=null,this._invitationTogether=!1,this._invitation.start(e,this._joy.ripple),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=Kt(()=>this._invitation.freeze()),ye(this._entityId,"seen"))}_dismissInvitation(){if(this._clearInvitationStartTimer(),this._invitationAutoAllowed=!1,!this._invitation.curve)return;const t=this.renderRoot.querySelector("curve-graph"),e=t?.shadowRoot?.activeElement,i=e&&t?.curves[Number(e.getAttribute("data-curve"))],r=i?.controlPoints[Number(e?.getAttribute("data-point"))],s=this._entityId;t?.cancelInteraction(),this._dragActive=!1,this._dragUndoPushed=!1,this._invitation.clear(),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,this._entityId&&ye(this._entityId,"dismissed"),e&&this.updateComplete.then(async()=>{await(t?.updateComplete);const n=this.shadowRoot?.activeElement,o=t?.shadowRoot?.activeElement;let a=document.activeElement;for(;a?.shadowRoot?.activeElement;)a=a.shadowRoot.activeElement;const l=!a||[document.body,document.documentElement,this,t,e].includes(a);s!==this._entityId||!l||n&&n!==t||o&&o!==e||i&&r&&t?.focusPoint(i.entityId,r.lightener)||this.renderRoot.querySelector(".invitation-replay")?.focus({preventScroll:!0})})}_finishInvitation(){this._invitation.curve&&(this._invitation.clear(),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,this._entityId&&ye(this._entityId,"completed"),this._invitationTogether=!0,this._invitationEditHint="touch"===this._invitationInput||"pen"===this._invitationInput?vt.invitation.touchAdd:"keyboard"===this._invitationInput?vt.invitation.keyboardAdd:vt.invitation.mouseAdd,null!==this._invitationHintTimer&&clearTimeout(this._invitationHintTimer),this._invitationHintTimer=setTimeout(()=>{this._invitationEditHint=null,this._invitationTogether=!1,this._invitationHintTimer=null},Bt.context),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onGraphInteraction(t){this.experimentalFirstUse&&this.requestUpdate(),"start"===t.detail.phase&&(this._clearInvitationStartTimer(),this._invitationAutoAllowed=!1,this._invitationInput=t.detail.input,this._invitation.curve&&this._invitation.freeze())}_clearInvitationStartTimer(){null!==this._invitationStartTimer&&clearTimeout(this._invitationStartTimer),this._invitationStartTimer=null}_scheduleAutomaticInvitation(){if(!this._invitationAutoAllowed||!this._invitationVisible||document.hidden||!this._canRunInvitation)return void this._clearInvitationStartTimer();if(null!==this._invitationStartTimer)return;const t=this._entityId,e=this._invitationGraph;this._invitationStartTimer=setTimeout(()=>{this._invitationStartTimer=null,t===this._entityId&&e===this._invitationGraph&&this._invitationAutoAllowed&&this._invitationVisible&&!document.hidden&&this._startInvitation(!0)},ue)}_syncInvitation(){if(!this.experimentalFirstUse)return;const t=this.renderRoot.querySelector("curve-graph");t!==this._invitationGraph&&(this._clearInvitationStartTimer(),this._invitationObserver?.disconnect(),this._invitationGraph=t,this._invitationVisible=!1,t&&"undefined"!=typeof IntersectionObserver?(this._invitationObserver=new IntersectionObserver(t=>{const e=t.find(t=>t.target===this._invitationGraph);if(!e)return;const i=this._invitationVisible;this._invitationVisible=e.isIntersecting&&e.intersectionRatio>=.5,this._invitationVisible?this._scheduleAutomaticInvitation():(this._clearInvitationStartTimer(),(i||this._invitation.curve)&&this._dismissInvitation())},{threshold:[0,.5]}),this._invitationObserver.observe(t)):this._invitationVisible=!!t),this._invitation.curve&&!this._canRunInvitation&&this._dismissInvitation(),this._scheduleAutomaticInvitation()}get _canManageLights(){return this._isAdmin&&!!this._hass&&!!this._entityId&&!this._isDirty&&!this._saving&&!this._cancelAnimating&&!this._load.loading&&!this._membershipLocked&&!this._load.loadError&&!this._groupDeleted}get dirty(){return this._isDirty}connectedCallback(){super.connectedCallback(),this._load.loadErrorEntityId!==this._entityId&&(this._load=Xe(this._load)),this._groupDeleted&&this._load.loadedEntityId!==this._entityId&&(this._groupDeleted=!1,this._load=Xe(this._load)),this._tryLoadCurves(),this._boundKeyHandler=this._onKeyDown.bind(this),this._boundBeforeUnload=this._onBeforeUnload.bind(this),window.addEventListener("keydown",this._boundKeyHandler),window.addEventListener("beforeunload",this._boundBeforeUnload),this._boundFooterOverlaySync=()=>this._scheduleFooterOverlaySync(),window.addEventListener("resize",this._boundFooterOverlaySync),window.addEventListener("scroll",this._boundFooterOverlaySync,{passive:!0}),window.visualViewport?.addEventListener("resize",this._boundFooterOverlaySync),window.visualViewport?.addEventListener("scroll",this._boundFooterOverlaySync),this._coach.connect(this),this.addEventListener("pointerdown",this._onInvitationControl,!0),this.addEventListener("keydown",this._onInvitationControl,!0),document.addEventListener("visibilitychange",this._onInvitationVisibility)}disconnectedCallback(){this._dismissInvitation(),this._invitationObserver?.disconnect(),this._invitationGraph=null,this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,null!==this._invitationHintTimer&&clearTimeout(this._invitationHintTimer),this._invitationHintTimer=null,this.removeEventListener("pointerdown",this._onInvitationControl,!0),this.removeEventListener("keydown",this._onInvitationControl,!0),document.removeEventListener("visibilitychange",this._onInvitationVisibility),super.disconnectedCallback(),this._stopDrawIn(),this._clearMembershipStatus(),this._previewActive&&this._stopPreview(),this._clearPresetGraphTrial(),this._setMembershipOpen(!1),this._coach.disconnect(),this._previewController.disconnect(),this._dragActive=!1,this._boundKeyHandler&&window.removeEventListener("keydown",this._boundKeyHandler),this._boundBeforeUnload&&window.removeEventListener("beforeunload",this._boundBeforeUnload),this._boundFooterOverlaySync&&(window.removeEventListener("resize",this._boundFooterOverlaySync),window.removeEventListener("scroll",this._boundFooterOverlaySync),window.visualViewport?.removeEventListener("resize",this._boundFooterOverlaySync),window.visualViewport?.removeEventListener("scroll",this._boundFooterOverlaySync)),null!==this._footerOverlayFrame&&(cancelAnimationFrame(this._footerOverlayFrame),this._footerOverlayFrame=null),this._clearFooterOverlay(),"confirming"===this._saveState.phase&&(this._saveGuard.settleError(),this._load={...this._load,loading:!1,loaded:!1,reloadAfterLoadEntityId:void 0},this._dispatchSave({type:"reset"})),this._saveGuard.dispose(),this._cancelAnimFrame&&(cancelAnimationFrame(this._cancelAnimFrame),this._cancelAnimFrame=null,this._cancelAnimating=!1),this._morphLine=null,this._stopRipple()}updated(t){if(super.updated(t),this._syncInvitation(),t.has("_curves")||t.has("_originalCurves")||t.has("_cancelAnimating")){const t=this._isDirty;t!==this._lastEmittedDirtyState&&(this._lastEmittedDirtyState=t,this.dispatchEvent(new CustomEvent("curve-dirty-state",{detail:{dirty:t},bubbles:!0,composed:!0})),t&&this._dispatchSave({type:"dirty"}))}this._scheduleFooterOverlaySync()}_scheduleFooterOverlaySync(){null===this._footerOverlayFrame&&(this._footerOverlayFrame=requestAnimationFrame(()=>{this._footerOverlayFrame=null,this._syncFooterOverlay()}))}_syncFooterOverlay(){const t=this.renderRoot.querySelector(".footer-slot"),e=this.renderRoot.querySelector(".workspace");if(!t||!e)return;if(!this._embedded||!t.classList.contains("active"))return void this._clearFooterOverlay();this._clearFooterOverlay();const i=e.getBoundingClientRect(),r=t.getBoundingClientRect(),s=window.visualViewport?.height??document.documentElement.clientHeight??window.innerHeight;if(!(r.bottom-s>1))return;const n=Math.max(0,i.left),o=Math.max(0,Math.min(i.width,window.innerWidth-n));t.dataset.overlay="true",t.style.setProperty("--curve-footer-overlay-left",`${n}px`),t.style.setProperty("--curve-footer-overlay-width",`${o}px`)}_clearFooterOverlay(){const t=this.renderRoot.querySelector(".footer-slot");t&&(delete t.dataset.overlay,t.style.removeProperty("--curve-footer-overlay-left"),t.style.removeProperty("--curve-footer-overlay-width"))}_setPresetGraphTrial(t){this._presetGraphTrial?.id!==t?.id&&(this._presetGraphTrial=t,this.dispatchEvent(new CustomEvent("preset-trial-change",{detail:{presetId:t?.id??null},bubbles:!0,composed:!0})))}_clearPresetGraphTrial(){this._pendingPresetGraphTrial=null,this._hoveredPresetGraphTrial=null,this._focusedPresetGraphTrial=null,this._setPresetGraphTrial(null),this._lastPresetPointerType=null}_dismissCoach(){this._coach.dismiss(),this.updateComplete.then(()=>{this.renderRoot.querySelector(".coach-help")?.focus()})}_toggleCoach(){!this._isAdmin||this._saving||this._cancelAnimating||this._membershipLocked||("inactive"===this._coach.phase?this._coach.toggle(this._isDirty):this._dismissCoach())}_rememberPresetPointer(t){this._lastPresetPointerType=t.pointerType}_startPresetGraphTrial(t,e){if(this._invitation.curve)return;"touch"!==(e&&"pointerType"in e?String(e.pointerType):this._lastPresetPointerType)&&(this._canShowPresetGraphTrial||this._drawIn)&&(this._coach.stopShimmer(),"pointerenter"===e?.type&&(this._hoveredPresetGraphTrial=t),"focus"===e?.type&&(this._focusedPresetGraphTrial=t),this._drawIn?this._pendingPresetGraphTrial=t:this._canShowPresetGraphTrial&&this._setPresetGraphTrial(t))}_endPresetGraphTrial(t,e){"blur"===e.type?this._focusedPresetGraphTrial?.id===t.id&&(this._focusedPresetGraphTrial=null):this._hoveredPresetGraphTrial?.id===t.id&&(this._hoveredPresetGraphTrial=null),this._lastPresetPointerType=null;const i=this._hoveredPresetGraphTrial??this._focusedPresetGraphTrial;i?this._startPresetGraphTrial(i):this._clearPresetGraphTrial()}_applyPreset(t){if(this._dismissInvitation(),this._cancelAnimating||this._saving||this._membershipLocked)return;const e=this._selectedCurve;if(!e)return void this._clearPresetGraphTrial();const i=e.entityId,r=function(t,e,i){const r=()=>i.map(t=>({...t}));return null!==e?t.map(t=>t.entityId===e?{...t,controlPoints:r()}:t):t.map(t=>({...t,controlPoints:r()}))}(this._curves,i,t.controlPoints);if(this._clearPresetGraphTrial(),Ae(r,this._curves))return;const s=Wt(this._joy,"ripple")?this._shownShape(e):null;this._commitCurveEdit(r),this._startRipple(i,s),this._coach.afterEdit()}get _liveRipple(){const t=this._ripple,e=t&&this._curves.find(e=>e.entityId===t.entityId);return t&&e?.controlPoints===t.committed?t:null}_shownShape(t){const e=this._liveRipple;return e?.entityId===t.entityId?e.shown:te(t.controlPoints)}_startRipple(t,e){if(this._stopRipple(),!e)return;const i=this._curves.find(e=>e.entityId===t)?.controlPoints;if(!i)return;const r=ae(e,te(i));this._ripple={entityId:t,committed:i,shown:de(r,0)},this._cancelRippleLoop=Xt(he(r),e=>{this._liveRipple&&!Vt()?this._ripple={entityId:t,committed:i,shown:de(r,e)}:this._stopRipple()},()=>this._stopRipple())}_stopRipple(){this._cancelRippleLoop?.(),this._cancelRippleLoop=null,this._ripple=null}_cutRippleLine(t){const e=this._liveRipple,i=e&&t.find(t=>t.entityId===e.entityId);return e&&i?{entityId:e.entityId,from:e.shown.pieces,to:te(i.controlPoints).pieces}:null}get _curveFrame(){const t=this._morphLine;if(t)return{entityId:t.entityId,pieces:pe(t.from,t.to,t.t),knots:null};const e=this._liveRipple;return e?{entityId:e.entityId,pieces:e.shown.pieces,knots:ce(e.committed,e.shown)}:null}_controlPointsEqual(t,e){return t.length===e.length&&t.every((t,i)=>t.lightener===e[i]?.lightener&&t.target===e[i]?.target)}_matchingPresetId(t){return mt.find(e=>this._controlPointsEqual(t.controlPoints,e.controlPoints))?.id??null}_presetChipLabel(t){return vt.presets.chipLabels[t.id]??t.name}_renderPresetSparkline(t){return q`
      <svg class="shape-chip-spark" viewBox="0 0 64 40" aria-hidden="true">
        <polyline
          points=${function(t){return t.controlPoints.map(t=>{const e=4+t.lightener/100*56,i=36-t.target/100*32;return`${e.toFixed(1)},${i.toFixed(1)}`}).join(" ")}(t)}
          fill="none"
          stroke="var(--accent, #2563eb)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></polyline>
      </svg>
    `}_renderShapeChips(){const t=this._selectedCurve;if(!t||!this._isAdmin||this._membershipLocked)return W;const e=this._matchingPresetId(t),i=this._isShowingPresetGraphTrial?this._presetGraphTrial?.id:null;return q`
      <div class="shape-chip-bar" role="group" aria-label=${vt.presets.panelAria}>
        ${mt.map(r=>{const s=i===r.id,n=this._invitation.presetHighlighted&&"dim_accent"===r.id,o=!this._invitation.curve&&(s||!i&&e===r.id);return q`
            <button
              class="preset-option shape-chip ${s?"trial":""} ${o?"active":""} ${n?"invitation-chip":""}"
              data-preset=${r.id}
              aria-current=${o?"true":W}
              aria-label=${`${r.name}. ${n?vt.invitation.forLight(t.friendlyName):vt.presets.chooseForLight(t.friendlyName)}`}
              @pointerdown=${t=>this._rememberPresetPointer(t)}
              @pointerenter=${t=>this._startPresetGraphTrial(r,t)}
              @pointerleave=${t=>this._endPresetGraphTrial(r,t)}
              @pointercancel=${t=>this._endPresetGraphTrial(r,t)}
              @focus=${t=>this._startPresetGraphTrial(r,t)}
              @blur=${t=>this._endPresetGraphTrial(r,t)}
              @click=${()=>this._applyPreset(r)}
            >
              ${this._renderPresetSparkline(r)}
              <span class="shape-chip-name">${this._presetChipLabel(r)}</span>
            </button>
          `})}
      </div>
    `}_storedStateKey(t){return`lightener:curve-card:v1:${t}`}_readStoredState(t){try{const e=sessionStorage.getItem(this._storedStateKey(t));if(!e)return null;const i=JSON.parse(e),r="string"==typeof i.selectedCurveId||null===i.selectedCurveId?i.selectedCurveId:null;let s=null;return"number"==typeof i.scrubberPosition&&isFinite(i.scrubberPosition)&&(s=Math.min(100,Math.max(0,i.scrubberPosition))),{selectedCurveId:r,scrubberPosition:s}}catch{return null}}_writeStoredState(t,e){t===this._entityId&&(this._sessionStateInitialized=!0);try{const i={...this._readStoredState(t)??{selectedCurveId:null,scrubberPosition:null},...e};sessionStorage.setItem(this._storedStateKey(t),JSON.stringify(i))}catch{}}_onKeyDown(t){var e,i;(t.composedPath().includes(this)||(e=document.activeElement,i=this,!e||e===i||e===document.body||i.contains(e)))&&((t.ctrlKey||t.metaKey)&&"s"===t.key&&this._isDirty&&this._isAdmin&&!this._saving&&!this._membershipLocked&&(t.preventDefault(),this._onSave()),!t.ctrlKey&&!t.metaKey||"z"!==t.key||t.shiftKey||!this._saving&&!this._cancelAnimating&&!this._membershipLocked&&this._undoStack.length>0&&(t.preventDefault(),this._undo()),"Escape"===t.key&&(this._invitation.curve?(t.preventDefault(),this._dismissInvitation()):this._presetGraphTrial?(t.preventDefault(),this._clearPresetGraphTrial()):!this._isDirty||this._saving||this._cancelAnimating||this._membershipLocked||(t.preventDefault(),this._onCancel())))}_onBeforeUnload(t){this._isDirty&&(t.preventDefault(),t.returnValue="")}async _tryLoadCurves(){const t=this._saveGuard.currentGeneration();if(!function(t,e){return!(t.loaded&&t.loadedEntityId===e||t.loading)}(this._load,this._entityId))return;if(!this._hass||!this._entityId){if(0===this._curves.length){const t=[{entityId:"light.ceiling_light",friendlyName:"Ceiling Light",controlPoints:[{lightener:0,target:0},{lightener:20,target:0},{lightener:60,target:80},{lightener:100,target:100}],visible:!0,color:Lt[0]},{entityId:"light.sofa_lamp",friendlyName:"Sofa Lamp",controlPoints:[{lightener:0,target:0},{lightener:10,target:50},{lightener:40,target:100},{lightener:70,target:100},{lightener:100,target:60}],visible:!0,color:Lt[1]},{entityId:"light.led_strip",friendlyName:"LED Strip",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}],visible:!0,color:Lt[2]}];this._curves=t,this._originalCurves=Ce(t),this._cleanVersion=this._dirtyVersion}return}this._load=function(t){return{...t,loadError:null,loading:!0}}(this._load);const e=this._entityId;try{const i=await this._hass.callWS({type:"lightener/get_curves",entity_id:e}),{state:r,action:s}=function(t,e,i,r){return i!==e?{state:t,action:"discard"}:t.reloadAfterLoadEntityId===e?{state:t,action:"run-queued-reload"}:r?{state:{...t,pendingReloadEntityId:e,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"defer-dirty"}:{state:{...t,pendingReloadEntityId:void 0,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"apply"}}(this._load,e,this._entityId,this._isDirty);let n;if("apply"!==s&&"defer-dirty"!==s||(n=Ee(i.entities,this._hass.states,Lt)),this._load=r,("apply"===s||"defer-dirty"===s)&&"apply"===s&&n){if(this._curves=n,this._originalCurves=Ce(n),this._cleanVersion=this._dirtyVersion,!this._sessionStateInitialized&&this._curves.length>0&&null===this._selectedCurveId&&null===this._scrubberPosition){this._sessionStateInitialized=!0;const t=this._readStoredState(e);this._invitationAutoAllowed=this.experimentalFirstUse&&!0===this._config.firstRun&&!t&&!function(t){if(ve.has(t))return!0;try{return null!==localStorage.getItem(me(t))}catch{return!1}}(e)&&be(this._curves),t?(null!==t.selectedCurveId&&Te(this._curves,t.selectedCurveId)&&(this._selectedCurveId=t.selectedCurveId),null!==t.scrubberPosition&&(this._scrubberPosition=t.scrubberPosition)):this._invitationAutoAllowed?this._selectedCurveId=this._invitationTarget?.entityId??null:!0===this._config.firstRun&&"choose_shape"===this._coach.phase&&(this._selectedCurveId=this._curves[0].entityId,this._writeStoredState(e,{selectedCurveId:this._selectedCurveId}))}this.updateComplete.then(()=>this._coach.maybeStartShimmer()),this._saveGuard.confirm(t)}}catch(i){const{state:r,discarded:s}=function(t,e,i,r){return i!==e?{state:t,discarded:!0}:{state:{...t,loadError:r,loaded:!0,loadedEntityId:e,loadErrorEntityId:e},discarded:!1}}(this._load,e,this._entityId,String(i));this._load=r,s||(console.error("[Lightener] Failed to load curves:",i),this._saveGuard.fail(t,"Save failed. Check connection."))}finally{const{state:t,followUp:i}=function(t,e,i){const r={...t,loading:!1};return i!==e?{state:r,followUp:"reload-changed-entity"}:t.reloadAfterLoadEntityId===e?{state:{...r,reloadAfterLoadEntityId:void 0,loaded:!1},followUp:"run-queued-reload"}:{state:r,followUp:"none"}}(this._load,e,this._entityId);this._load=t,"none"!==i&&this._tryLoadCurves()}}_onScrubberMove(t){this._dismissInvitation(),this._invitationTogether=!1,this._clearPresetGraphTrial();const e=t.detail.position;this._scrubberPosition=e,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{scrubberPosition:e}),this._previewActive&&this._previewLights(e)}_onScrubberStart(){}_onScrubberEnd(){}_refreshActivePreview(t=!1){this._previewController.refresh(t)}_previewLights(t,e=!1){this._previewController.previewLights(t,e)}_previewSingleLight(t,e,i=!1,r){this._previewController.previewSingleLight(t,e,i,r)}_onSelectCurve(t){if(this._dismissInvitation(),this._cancelAnimating)return;const{entityId:e}=t.detail;(e===this._selectedCurveId||Te(this._curves,e))&&(this._clearPresetGraphTrial(),this._selectedCurveId=function(t,e){return t===e?null:e}(this._selectedCurveId,e),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}),this._refreshActivePreview(!0))}_onFocusCurve(t){if(this._invitation.curve&&t.detail.entityId===this._selectedCurveId)return void this._invitation.freeze();if(this._dismissInvitation(),this._cancelAnimating)return;const{entityId:e}=t.detail;Te(this._curves,e)&&(this._clearPresetGraphTrial(),this._selectedCurveId=e,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}),this._refreshActivePreview(!0))}_pushUndo(){Me(this._undoStack,this._curves)}_commitCurveEdit(t){this._pushUndo(),this._curves=t,this._dirtyVersion++,this._refreshActivePreview(!0)}_completeDragMaybeReload(){this._dragUndoPushed=!1,this._dragActive=!1,!this._load.loaded&&this._hass&&this._tryLoadCurves()}_undo(){this._dismissInvitation(),0!==this._undoStack.length&&null===this._cancelAnimFrame&&(this._clearPresetGraphTrial(),this._animateCurvesTo(this._undoStack.pop(),()=>{this._refreshActivePreview(!0)}))}_animateCurvesTo(t,e){const i=Ce(this._curves),r=this._cutRippleLine(t);this._stopRipple(),this._morphLine=r?{...r,t:0}:null,this._cancelAnimating=!0;const s=performance.now(),n=o=>{const a=o-s,l=Math.min(a/300,1),h=Ut(l);this._morphLine=r&&l<1?{...r,t:Math.max(h,0)}:null;const d=t.map((t,e)=>{const r=i[e];if(!r)return t;const s=r.controlPoints,n=t.controlPoints,o=function(t,e,i){const r=Math.min(t.length,e.length),s=[];for(let n=0;n<r;n++)s.push({lightener:Math.round(t[n].lightener+(e[n].lightener-t[n].lightener)*i),target:Math.round(t[n].target+(e[n].target-t[n].target)*i)});return s}(s,n,h);if(n.length>o.length&&l>=1)for(let t=o.length;t<n.length;t++)o.push({...n[t]});if(s.length>o.length&&l<1)for(let t=o.length;t<s.length;t++)o.push({...s[t]});return o.sort((t,e)=>t.lightener-e.lightener),{...t,controlPoints:o,visible:r.visible}});if(this._curves=d,l<1)this._cancelAnimFrame=requestAnimationFrame(n);else{this._curves=function(t,e){return e.map((e,i)=>({...e,visible:t[i]?.visible??e.visible}))}(i,t),this._cancelAnimating=!1,this._cancelAnimFrame=null;const r=Ae(this._curves,this._originalCurves);r&&(this._cleanVersion=this._dirtyVersion,this._coach.afterClean()),e?.(),r&&this._reloadPendingDirtyResponse()}};this._cancelAnimFrame=requestAnimationFrame(n)}_onPointMove(t){if(this._cancelAnimating)return;this._clearPresetGraphTrial();const{curveIndex:e,pointIndex:i,lightener:r,target:s}=t.detail,n=this._graphCurves,o=n[e]?.controlPoints[i];if(o?.lightener===r&&o.target===s)return;const a=function(t,e,i,r,s){const n=[...t],o=n[e];if(!o||!o.controlPoints[i])return null;const a={...o},l=[...a.controlPoints];return l[i]={lightener:r,target:s},a.controlPoints=l,n[e]=a,n}(n,e,i,r,s);if(null===a)return;this._dragActive=!0,this._dragUndoPushed||(this._pushUndo(),this._dragUndoPushed=!0);const l=this._curves[e];l&&this._selectedCurveId!==l.entityId&&(this._selectedCurveId=l.entityId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId})),this._curves=a,this._dirtyVersion++,this._finishInvitation(),this._coach.afterEdit(),l?this._previewSingleLight(l.entityId,r,!1,s):this._refreshActivePreview()}_onPointDrop(t){this._completeDragMaybeReload()}_onPointAdd(t){if(this._cancelAnimating)return;this._clearPresetGraphTrial();const{lightener:e,target:i,entityId:r}=t.detail,s=r??this._selectedCurveId;if(!s)return;const n=function(t,e,i,r){return function(t,e,i,r){const s=t.findIndex(t=>t.entityId===e);if(s<0)return null;if(t[s].controlPoints.some(t=>t.lightener===i))return null;const n=[...t],o={...n[s]};return o.controlPoints=[...o.controlPoints,{lightener:i,target:r}].sort((t,e)=>t.lightener-e.lightener),n[s]=o,n}(t,e,i,r)}(this._graphCurves,s,e,i);null!==n&&(this._commitCurveEdit(n),this._finishInvitation(),this._coach.afterEdit())}_onPointRemove(t){if(this._cancelAnimating)return;this._clearPresetGraphTrial(),this._completeDragMaybeReload();const{curveIndex:e,pointIndex:i}=t.detail,r=Le(this._graphCurves,e,i);null!==r&&(this._commitCurveEdit(r),this._finishInvitation(),this._coach.afterEdit())}_onToggleCurve(t){if(this._dismissInvitation(),this._cancelAnimating)return;this._clearPresetGraphTrial();const{entityId:e}=t.detail,i=this._selectedCurveId,r=function(t,e,i){const r=function(t,e){return t.map(t=>t.entityId===e?{...t,visible:!t.visible}:t)}(t,i);let s=e;if(e===i){const t=r.find(t=>t.entityId===i);t&&!t.visible&&(s=null)}return{curves:r,selectedCurveId:s}}(this._curves,this._selectedCurveId,e);this._curves=r.curves,r.selectedCurveId!==i&&(this._selectedCurveId=r.selectedCurveId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}async _onDeleteGroup(){if(!this._hass||!this._entityId||this._managingLights)return;this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview();const t=this._entityId;this._manageError=null,this._managingLights=!0;try{const e=await this._hass.callWS({type:"config/entity_registry/get",entity_id:t});if(e?.platform!==xe)throw new Error("Entity is not a Lightener group — cannot delete from this card.");const i=e?.config_entry_id;if(!i)throw new Error("Group is not backed by a config entry — cannot delete from the card.");await this._hass.callApi("DELETE",`config/config_entries/entry/${i}`),this._curves=[],this._originalCurves=[],this._undoStack=[],this._load={...this._load,loaded:!0,loadedEntityId:t,loadError:null,loadErrorEntityId:void 0},this._selectedCurveId=null,this._writeStoredState(t,{selectedCurveId:null}),this._groupDeleted=!0,this.dispatchEvent(new CustomEvent("lightener-group-deleted",{detail:{entityId:t,configEntryId:i},bubbles:!0,composed:!0}))}catch(t){console.error("[Lightener] Failed to delete group:",t),this._manageError=this._formatManageError(t,"Could not delete group.")}finally{this._managingLights=!1}}_openMembershipEditor(){this._dismissInvitation(),this._canManageLights&&(this._coach.interrupt(),this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview(),this._manageError=null,this._clearMembershipStatus(),this._setMembershipOpen(!0))}_closeMembershipEditor(){return this._setMembershipOpen(!1),(async()=>{if(await this.updateComplete,this._membershipOpen)return;const t=this.renderRoot.querySelector("curve-legend");await(t?.updateComplete),!this._membershipOpen&&this.isConnected&&t?.renderRoot?.querySelector(".add-light-btn")?.focus()})().catch(t=>this._reportMembershipFocusRestoreError(t))}_reportMembershipFocusRestoreError(t){console.warn("[Lightener] Could not restore focus after closing Edit lights:",t)}_onMembershipApplied(t){if(!this._hass)return;const e=t.detail,i=new Map(this._curves.map(t=>[t.entityId,t.visible]));this._stopDrawIn(),this._curves=Ee(e.entities,this._hass.states,Lt).map(t=>({...t,visible:i.get(t.entityId)??!0})),this._originalCurves=Ce(this._curves);const r=new Set(this._curves.filter(t=>!i.has(t.entityId)).map(t=>t.entityId));this._cleanVersion=this._dirtyVersion,this._undoStack=[];const s=(e.added_entity_ids??[]).find(t=>this._curves.some(e=>e.entityId===t));s?this._selectedCurveId=s:null===this._selectedCurveId||this._curves.some(t=>t.entityId===this._selectedCurveId)||(this._selectedCurveId=null),this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:this._selectedCurveId}),this._showMembershipStatus();const n=this._closeMembershipEditor();if(r.size>0&&this.isConnected&&Wt(this._joy,"draw_in")){this._startDrawIn(r);const t=this._drawIn.token;n.then(()=>{this._drawIn?.token===t&&!this._membershipOpen&&this.isConnected&&(this._drawIn={...this._drawIn,ready:!0})})}}_startDrawIn(t){this._stopDrawIn(),this._drawIn={ids:t,token:++this._drawInToken,ready:!1},this._drawInWaitingForVisible=!0,this._unsubscribeDrawInMotion=Kt(this._boundStopDrawIn),this.addEventListener("pointerdown",this._boundStopDrawIn,!0),this.addEventListener("keydown",this._boundStopDrawIn,!0),this.addEventListener("click",this._boundStopDrawIn,!0)}_stopDrawIn(){null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=null,this._unsubscribeDrawInMotion?.(),this._unsubscribeDrawInMotion=null,this.removeEventListener("pointerdown",this._boundStopDrawIn,!0),this.removeEventListener("keydown",this._boundStopDrawIn,!0),this.removeEventListener("click",this._boundStopDrawIn,!0),this._drawInWaitingForVisible=!1,this._drawIn=null;const t=this._pendingPresetGraphTrial;this._pendingPresetGraphTrial=null,t&&this.isConnected&&this._canShowPresetGraphTrial&&this._startPresetGraphTrial(t)}_showMembershipStatus(){this._clearMembershipStatus(),"error"!==this._saveState.phase&&this._dispatchSave({type:"reset"}),this._membershipStatus=vt.membership.updated,this._membershipStatusTimer=window.setTimeout(()=>{this._membershipStatusTimer=null,this._membershipStatus=null},2e3)}_clearMembershipStatus(){null!==this._membershipStatusTimer&&(window.clearTimeout(this._membershipStatusTimer),this._membershipStatusTimer=null),this._membershipStatus=null}_setMembershipOpen(t){this._membershipOpen!==t&&(this._membershipOpen=t,this.dispatchEvent(new CustomEvent("lightener-membership-state",{detail:{open:t},bubbles:!0,composed:!0})))}_formatManageError(t,e){const i=t;return i?.message?i.message:e}async saveCurves(){return this._onSave()}async _onSave(){if(this._dismissInvitation(),!this._hass||!this._entityId||this._saving||this._cancelAnimating||this._membershipLocked)return!1;this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview();const t=this._entityId;this._dispatchSave({type:"save-start"});try{const e=function(t){const e={};for(const i of t){const t={};let r=-1,s=0;for(const e of i.controlPoints)Number.isFinite(e.lightener)&&Number.isFinite(e.target)&&(e.lightener<0||e.lightener>100||e.target<0||e.target>100||0===e.lightener&&0===e.target||(t[String(e.lightener)]=String(e.target),e.lightener>r&&(r=e.lightener,s=e.target)));!("100"in t)&&r>=0&&(t[100]=String(s)),e[i.entityId]={brightness:t}}return e}(this._curves);if(await this._hass.callWS({type:"lightener/save_curves",entity_id:t,curves:e}),this._entityId!==t)return this._previewActive&&this._stopPreview(),this._undoStack=[],this._dispatchSave({type:"reset"}),!1;this._cleanVersion=this._dirtyVersion,this._undoStack=[],this._load={...this._load,pendingReloadEntityId:void 0},this._dispatchSave({type:"save-success"});const{settled:i}=this._saveGuard.arm(),{state:r,runNow:s}=We(this._load,t);this._load=r,s&&this._tryLoadCurves();const n="confirmed"===await i;return n&&this._coach.afterSave(),n}catch(t){return console.error("[Lightener] Failed to save curves:",t),this._dispatchSave({type:"save-error",message:"Save failed. Check connection."}),!1}}_retryLoad(){this._load=function(t){return{...t,loaded:!1,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._tryLoadCurves()}_reloadCurvesAfterCurrentLoad(t){const{state:e,runNow:i}=We(this._load,t);this._load=e,i&&this._tryLoadCurves()}_reloadPendingDirtyResponse(){const{state:t,reloadEntityId:e}=function(t,e){const i=t.pendingReloadEntityId;return i&&i===e?{state:{...t,pendingReloadEntityId:void 0},reloadEntityId:i}:{state:t}}(this._load,this._entityId);this._load=t,e&&this._reloadCurvesAfterCurrentLoad(e)}_onCancel(){this._dismissInvitation(),this._cancelAnimating||(this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview(),this._undoStack=[],this._animateCurvesTo(Ce(this._originalCurves),()=>{this._selectedCurveId=!0===this._config.firstRun&&"choose_shape"===this._coach.phase?this._curves[0]?.entityId??null:null,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:this._selectedCurveId}),this._dispatchSave({type:"reset"})}))}_renderLoadingSkeleton(){return q`
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-graph" aria-hidden="true">
          <span class="loading-curve primary"></span>
          <span class="loading-curve warm"></span>
          <span class="loading-curve cool"></span>
          <span class="loading-point one"></span>
          <span class="loading-point two"></span>
          <span class="loading-point three"></span>
        </div>
        <div class="loading-caption">${vt.card.loading}</div>
      </div>
    `}_renderGraphInsight(){if(this._isShowingPresetGraphTrial&&this._presetGraphTrial){const t=this._selectedCurve;return t?q`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${vt.presets.trying(this._presetGraphTrial.name)}
            >${vt.presets.trying(this._presetGraphTrial.name)}</span
          >
          <span
            class="graph-insight-secondary"
            title=${vt.presets.chooseForLight(t.friendlyName)}
            >${vt.presets.chooseForLight(t.friendlyName)}</span
          >
        </div>
      `:W}const t=ze(this._curves,this._selectedCurveId);return t?q`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${t.primary}>${t.primary}</span>
        <span class="graph-insight-secondary" title=${t.secondary}>${t.secondary}</span>
      </div>
    `:W}_renderGraphWorkbenchInsight(){if(this.experimentalFirstUse){const t=this._selectedCurve?.friendlyName;if(this._invitation.curve||this._invitationEditHint)return q`<div class="graph-insight invitation-insight">
          <span class="graph-insight-primary" title=${t??""}>${t}</span>
          <span class="graph-insight-secondary"
            >${this._invitation.curve?vt.invitation.example:this._invitationEditHint}</span
          >
        </div>`}if(this._isAdmin&&"inactive"!==this._coach.phase){const t="choose_shape"===this._coach.phase?vt.coach.chooseTitle:"complete"===this._coach.phase?vt.coach.savedTitle:vt.coach.readyTitle,e="choose_shape"===this._coach.phase?vt.coach.chooseBody:"complete"===this._coach.phase?vt.coach.savedBody:vt.coach.readyBody;return q`
        <div class="coach-prompt" role="status" aria-live="polite">
          <span class="coach-copy"><strong>${t}</strong><span>${e}</span></span>
          <button
            type="button"
            class="coach-dismiss"
            aria-label=${vt.coach.dismiss}
            title=${vt.coach.dismiss}
            @click=${this._dismissCoach}
          >
            ×
          </button>
        </div>
      `}if(this._isShowingPresetGraphTrial&&this._presetGraphTrial)return q`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${vt.presets.trying(this._presetGraphTrial.name)}
            >${vt.presets.trying(this._presetGraphTrial.name)}</span
          >
        </div>
      `;const t=ze(this._curves,this._selectedCurveId);return t?q`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${t.primary}>${t.primary}</span>
      </div>
    `:W}_renderGraphWorkbench(){const t=this._renderShapeChips();return t===W?q`<div class="graph-workbench">
        ${this._isAdmin&&"inactive"!==this._coach.phase?this._renderGraphWorkbenchInsight():this._renderGraphInsight()}
        <div class="shape-chip-reserve" aria-hidden="true"></div>
      </div>`:q`<div class="graph-workbench">${this._renderGraphWorkbenchInsight()}${t}</div>`}render(){const t=this._graphCurves,e=!this._isAdmin||this._membershipLocked||this._isDirty||this._saving||this._cancelAnimating||this._undoStack.length>0;return q`
      <div
        class="card ${this._embedded?"embedded":""} ${this.experimentalFirstUse?"first-use-experiment":""}"
        role="region"
        aria-label="Brightness editor"
      >
        <span class="sr-only invitation-announcement" role="status" aria-atomic="true"
          >${this._invitation.curve?vt.invitation.announcement(this._invitation.curve.friendlyName):""}</span
        >
        <div class="header">
          <h2>${this._config.title??"Brightness shapes"}</h2>
          ${this.experimentalFirstUse&&this._isAdmin?q`<button
                type="button"
                class="invitation-replay ${this._invitation.curve?"invitation-dismiss":""}"
                aria-label=${this._invitation.curve?vt.invitation.dismiss:vt.invitation.replay}
                title=${this._invitation.curve?vt.invitation.dismiss:vt.invitation.replay}
                ?disabled=${!this._invitation.curve&&!this._canRunInvitation}
                @click=${()=>this._invitation.curve?this._dismissInvitation():this._startInvitation()}
              >
                ${this._invitation.curve?"×":"↻"}
              </button>`:this._isAdmin&&this._curves.length>0&&!this._load.loading?q`<button
                  type="button"
                  class="coach-help"
                  aria-label=${vt.coach.help}
                  title=${vt.coach.help}
                  aria-expanded=${"inactive"!==this._coach.phase}
                  ?disabled=${this._saving||this._cancelAnimating||this._membershipLocked}
                  @click=${this._toggleCoach}
                >
                  ?
                </button>`:W}
        </div>

        <div class="workspace">
          <div class="editor-column">
            <div class="main-stack">
              ${this._load.loading?this._renderLoadingSkeleton():q`<div class="graph-panel">
                    ${this._renderGraphWorkbench()}
                    <curve-graph
                      .curves=${t}
                      .selectedCurveId=${this._selectedCurveId}
                      .entityId=${this._entityId??null}
                      .readOnly=${!this._isAdmin||this._cancelAnimating||this._membershipLocked}
                      .scrubberPosition=${this._effectiveScrubberPosition}
                      .previewCurve=${this._presetPreviewCurve}
                      .exampleEntityId=${this._invitation.curve?.entityId??null}
                      .exampleCueAnimating=${this._invitation.cueAnimating}
                      .exampleInstruction=${this._invitation.curve&&this._invitation.showInstruction?vt.invitation.drag:null}
                      .joy=${this._joy}
                      .curveFrame=${this._curveFrame}
                      .drawIn=${this._drawIn}
                      @draw-in-started=${this._onDrawInStarted}
                      @draw-in-waiting=${this._onDrawInWaiting}
                      @pointerdown=${this._onGraphPointerDown}
                      @point-move=${this._onPointMove}
                      @point-drop=${this._onPointDrop}
                      @point-add=${this._onPointAdd}
                      @point-remove=${this._onPointRemove}
                      @graph-interaction=${this._onGraphInteraction}
                      @focus-curve=${this._onFocusCurve}
                    ></curve-graph>
                  </div>`}
              ${this._curves.length>0?q`<curve-scrubber
                    .curves=${t}
                    .example=${!!this._invitation.curve}
                    .firstUseHints=${this.experimentalFirstUse}
                    .invitation=${this._invitationTogether}
                    .readOnly=${!this._isAdmin||this._membershipLocked}
                    .canPreview=${this._isAdmin&&!this._cancelAnimating&&!this._membershipLocked}
                    .previewActive=${this._previewActive}
                    .dirty=${this._isDirty}
                    .position=${this._effectiveScrubberPosition}
                    @scrubber-move=${this._onScrubberMove}
                    @scrubber-start=${this._onScrubberStart}
                    @scrubber-end=${this._onScrubberEnd}
                    @preview-toggle=${this._onPreviewToggle}
                  ></curve-scrubber>`:W}
            </div>
          </div>

          <div class="footer-slot ${e?"active":""}">
            <curve-footer
              .dirty=${this._isDirty||this._cancelAnimating}
              .readOnly=${!this._isAdmin||this._membershipLocked}
              .saving=${this._saving||this._cancelAnimating||this._membershipLocked}
              .canUndo=${this._undoStack.length>0&&!this._cancelAnimating&&!this._membershipLocked}
              @save-curves=${this._onSave}
              @cancel-curves=${this._onCancel}
              @undo-curves=${()=>this._undo()}
            ></curve-footer>
          </div>

          <aside class="side-rail" aria-label=${vt.card.railAria}>
            <curve-legend
              .curves=${t}
              .exampleEntityId=${this._invitation.curve?.entityId??null}
              .selectedCurveId=${this._selectedCurveId}
              .scrubberPosition=${this._effectiveScrubberPosition}
              .canManage=${this._canManageLights}
              .managing=${this._managingLights}
              @select-curve=${this._onSelectCurve}
              @toggle-curve=${this._onToggleCurve}
              @edit-lights=${this._openMembershipEditor}
              @delete-group=${this._onDeleteGroup}
            ></curve-legend>
            ${this._manageError?q`<div class="error" role="alert">${$i} ${this._manageError}</div>`:W}
          </aside>
        </div>

        ${this._membershipOpen&&this._hass&&this._entityId?q`<light-membership-dialog
              .hass=${this._hass}
              .groupEntityId=${this._entityId}
              @membership-close=${this._closeMembershipEditor}
              @membership-applied=${this._onMembershipApplied}
            ></light-membership-dialog>`:W}

        <div class="status-stack">
          ${this._membershipStatus?q`<div class="success" role="status" aria-live="polite">
                ${this._membershipStatus}
              </div>`:W}
          ${this._saveSuccess?q`<div class="success" role="status" aria-live="polite">
                <svg
                  class="status-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Saved successfully
              </div>`:W}
          ${this._load.loadError?q`<div class="error" role="alert">
                ${$i} Failed to load curves
                <button type="button" class="retry-link" @click=${this._retryLoad}>Retry</button>
              </div>`:W}
          ${this._groupDeleted?q`<div class="error" role="status">
                ${$i} This Lightener group was deleted. Remove this card or point it at a
                different group.
              </div>`:W}
          ${this._saveError?q`<div class="error" role="alert">
                ${$i} Save failed
                <button type="button" class="retry-link" @click=${this._onSave}>Retry</button>
              </div>`:W}
        </div>
      </div>
    `}}Si.styles=je,t([gt({attribute:!1})],Si.prototype,"experimentalFirstUse",void 0),t([_t()],Si.prototype,"_invitationEditHint",void 0),t([_t()],Si.prototype,"_invitationTogether",void 0),t([_t()],Si.prototype,"_curves",void 0),t([_t()],Si.prototype,"_originalCurves",void 0),t([_t()],Si.prototype,"_config",void 0),t([_t()],Si.prototype,"_selectedCurveId",void 0),t([_t()],Si.prototype,"_saveState",void 0),t([_t()],Si.prototype,"_load",void 0),t([_t()],Si.prototype,"_manageError",void 0),t([_t()],Si.prototype,"_managingLights",void 0),t([_t()],Si.prototype,"_groupDeleted",void 0),t([_t()],Si.prototype,"_scrubberPosition",void 0),t([_t()],Si.prototype,"_cancelAnimating",void 0),t([_t()],Si.prototype,"_joy",void 0),t([_t()],Si.prototype,"_drawIn",void 0),t([_t()],Si.prototype,"_ripple",void 0),t([_t()],Si.prototype,"_morphLine",void 0),t([_t()],Si.prototype,"_hass",void 0),t([_t()],Si.prototype,"_previewActive",void 0),t([_t()],Si.prototype,"_presetGraphTrial",void 0),t([_t()],Si.prototype,"_membershipOpen",void 0),t([_t()],Si.prototype,"_membershipStatus",void 0),ke(we,Si);export{Si as LightenerCurveCard,ki as LightenerCurveCardEditor};
