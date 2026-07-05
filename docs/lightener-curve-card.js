function e(e,t,i,r){var n,s=arguments.length,o=s<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,r);else for(var a=e.length-1;a>=0;a--)(n=e[a])&&(o=(s<3?n(o):s>3?n(t,i,o):n(t,i))||o);return s>3&&o&&Object.defineProperty(t,i,o),o}"function"==typeof SuppressedError&&SuppressedError;const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),n=new WeakMap;let s=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=n.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(t,e))}return e}toString(){return this.cssText}};const o=e=>new s("string"==typeof e?e:e+"",void 0,r),a=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[r+1],e[0]);return new s(i,e,r)},l=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return o(t)})(e):e,{is:d,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:p,getOwnPropertySymbols:g,getPrototypeOf:u}=Object,v=globalThis,m=v.trustedTypes,_=m?m.emptyScript:"",f=v.reactiveElementPolyfillSupport,b=(e,t)=>e,y={toAttribute(e,t){switch(t){case Boolean:e=e?_:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},x=(e,t)=>!d(e,t),w={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),v.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=w){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(e,i,t);void 0!==r&&c(this.prototype,e,r)}}static getPropertyDescriptor(e,t,i){const{get:r,set:n}=h(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){const s=r?.call(this);n?.call(this,t),this.requestUpdate(e,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??w}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...p(e),...g(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(l(e))}else void 0!==e&&t.push(l(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,r)=>{if(i)e.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of r){const r=document.createElement("style"),n=t.litNonce;void 0!==n&&r.setAttribute("nonce",n),r.textContent=i.cssText,e.appendChild(r)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,i);if(void 0!==r&&!0===i.reflect){const n=(void 0!==i.converter?.toAttribute?i.converter:y).toAttribute(t,i.type);this._$Em=e,null==n?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(e,t){const i=this.constructor,r=i._$Eh.get(e);if(void 0!==r&&this._$Em!==r){const e=i.getPropertyOptions(r),n="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:y;this._$Em=r;const s=n.fromAttribute(t,e.type);this[r]=s??this._$Ej?.get(r)??s,this._$Em=null}}requestUpdate(e,t,i,r=!1,n){if(void 0!==e){const s=this.constructor;if(!1===r&&(n=this[e]),i??=s.getPropertyOptions(e),!((i.hasChanged??x)(n,t)||i.useDefault&&i.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(s._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:r,wrapped:n},s){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,s??t??this[e]),!0!==n||void 0!==s)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,r=this[t];!0!==e||this._$AL.has(t)||void 0===r||this.C(t,void 0,i,r)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,f?.({ReactiveElement:$}),(v.reactiveElementVersions??=[]).push("2.1.2");const k=globalThis,P=e=>e,C=k.trustedTypes,S=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,A="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,I="?"+E,T=`<${I}>`,M=document,L=()=>M.createComment(""),D=e=>null===e||"object"!=typeof e&&"function"!=typeof e,R=Array.isArray,G="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,z=/-->/g,N=/>/g,O=RegExp(`>|${G}(?:([^\\s"'>=/]+)(${G}*=${G}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),B=/'/g,H=/"/g,j=/^(?:script|style|textarea|title)$/i,F=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),q=F(1),V=F(2),K=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),X=new WeakMap,Y=M.createTreeWalker(M,129);function J(e,t){if(!R(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(t):t}const Z=(e,t)=>{const i=e.length-1,r=[];let n,s=2===t?"<svg>":3===t?"<math>":"",o=U;for(let t=0;t<i;t++){const i=e[t];let a,l,d=-1,c=0;for(;c<i.length&&(o.lastIndex=c,l=o.exec(i),null!==l);)c=o.lastIndex,o===U?"!--"===l[1]?o=z:void 0!==l[1]?o=N:void 0!==l[2]?(j.test(l[2])&&(n=RegExp("</"+l[2],"g")),o=O):void 0!==l[3]&&(o=O):o===O?">"===l[0]?(o=n??U,d=-1):void 0===l[1]?d=-2:(d=o.lastIndex-l[2].length,a=l[1],o=void 0===l[3]?O:'"'===l[3]?H:B):o===H||o===B?o=O:o===z||o===N?o=U:(o=O,n=void 0);const h=o===O&&e[t+1].startsWith("/>")?" ":"";s+=o===U?i+T:d>=0?(r.push(a),i.slice(0,d)+A+i.slice(d)+E+h):i+E+(-2===d?t:h)}return[J(e,s+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),r]};class Q{constructor({strings:e,_$litType$:t},i){let r;this.parts=[];let n=0,s=0;const o=e.length-1,a=this.parts,[l,d]=Z(e,t);if(this.el=Q.createElement(l,i),Y.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(r=Y.nextNode())&&a.length<o;){if(1===r.nodeType){if(r.hasAttributes())for(const e of r.getAttributeNames())if(e.endsWith(A)){const t=d[s++],i=r.getAttribute(e).split(E),o=/([.?@])?(.*)/.exec(t);a.push({type:1,index:n,name:o[2],strings:i,ctor:"."===o[1]?ne:"?"===o[1]?se:"@"===o[1]?oe:re}),r.removeAttribute(e)}else e.startsWith(E)&&(a.push({type:6,index:n}),r.removeAttribute(e));if(j.test(r.tagName)){const e=r.textContent.split(E),t=e.length-1;if(t>0){r.textContent=C?C.emptyScript:"";for(let i=0;i<t;i++)r.append(e[i],L()),Y.nextNode(),a.push({type:2,index:++n});r.append(e[t],L())}}}else if(8===r.nodeType)if(r.data===I)a.push({type:2,index:n});else{let e=-1;for(;-1!==(e=r.data.indexOf(E,e+1));)a.push({type:7,index:n}),e+=E.length-1}n++}}static createElement(e,t){const i=M.createElement("template");return i.innerHTML=e,i}}function ee(e,t,i=e,r){if(t===K)return t;let n=void 0!==r?i._$Co?.[r]:i._$Cl;const s=D(t)?void 0:t._$litDirective$;return n?.constructor!==s&&(n?._$AO?.(!1),void 0===s?n=void 0:(n=new s(e),n._$AT(e,i,r)),void 0!==r?(i._$Co??=[])[r]=n:i._$Cl=n),void 0!==n&&(t=ee(e,n._$AS(e,t.values),n,r)),t}class te{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,r=(e?.creationScope??M).importNode(t,!0);Y.currentNode=r;let n=Y.nextNode(),s=0,o=0,a=i[0];for(;void 0!==a;){if(s===a.index){let t;2===a.type?t=new ie(n,n.nextSibling,this,e):1===a.type?t=new a.ctor(n,a.name,a.strings,this,e):6===a.type&&(t=new ae(n,this,e)),this._$AV.push(t),a=i[++o]}s!==a?.index&&(n=Y.nextNode(),s++)}return Y.currentNode=M,r}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class ie{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,r){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=ee(this,e,t),D(e)?e===W||null==e||""===e?(this._$AH!==W&&this._$AR(),this._$AH=W):e!==this._$AH&&e!==K&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>R(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==W&&D(this._$AH)?this._$AA.nextSibling.data=e:this.T(M.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,r="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=Q.createElement(J(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===r)this._$AH.p(t);else{const e=new te(r,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=X.get(e.strings);return void 0===t&&X.set(e.strings,t=new Q(e)),t}k(e){R(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,r=0;for(const n of e)r===t.length?t.push(i=new ie(this.O(L()),this.O(L()),this,this.options)):i=t[r],i._$AI(n),r++;r<t.length&&(this._$AR(i&&i._$AB.nextSibling,r),t.length=r)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=P(e).nextSibling;P(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class re{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,r,n){this.type=1,this._$AH=W,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=W}_$AI(e,t=this,i,r){const n=this.strings;let s=!1;if(void 0===n)e=ee(this,e,t,0),s=!D(e)||e!==this._$AH&&e!==K,s&&(this._$AH=e);else{const r=e;let o,a;for(e=n[0],o=0;o<n.length-1;o++)a=ee(this,r[i+o],t,o),a===K&&(a=this._$AH[o]),s||=!D(a)||a!==this._$AH[o],a===W?e=W:e!==W&&(e+=(a??"")+n[o+1]),this._$AH[o]=a}s&&!r&&this.j(e)}j(e){e===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class ne extends re{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===W?void 0:e}}class se extends re{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==W)}}class oe extends re{constructor(e,t,i,r,n){super(e,t,i,r,n),this.type=5}_$AI(e,t=this){if((e=ee(this,e,t,0)??W)===K)return;const i=this._$AH,r=e===W&&i!==W||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,n=e!==W&&(i===W||r);r&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){ee(this,e)}}const le=k.litHtmlPolyfillSupport;le?.(Q,ie),(k.litHtmlVersions??=[]).push("3.3.2");const de=globalThis;class ce extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const r=i?.renderBefore??t;let n=r._$litPart$;if(void 0===n){const e=i?.renderBefore??null;r._$litPart$=n=new ie(t.insertBefore(L(),e),e,void 0,i??{})}return n._$AI(e),n})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}}ce._$litElement$=!0,ce.finalized=!0,de.litElementHydrateSupport?.({LitElement:ce});const he=de.litElementPolyfillSupport;he?.({LitElement:ce}),(de.litElementVersions??=[]).push("4.2.2");const pe={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:x},ge=(e=pe,t,i)=>{const{kind:r,metadata:n}=i;let s=globalThis.litPropertyMetadata.get(n);if(void 0===s&&globalThis.litPropertyMetadata.set(n,s=new Map),"setter"===r&&((e=Object.create(e)).wrapped=!0),s.set(i.name,e),"accessor"===r){const{name:r}=i;return{set(i){const n=t.get.call(this);t.set.call(this,i),this.requestUpdate(r,n,e,!0,i)},init(t){return void 0!==t&&this.C(r,void 0,e,t),t}}}if("setter"===r){const{name:r}=i;return function(i){const n=this[r];t.call(this,i),this.requestUpdate(r,n,e,!0,i)}}throw Error("Unsupported decorator location: "+r)};function ue(e){return(t,i)=>"object"==typeof i?ge(e,t,i):((e,t,i)=>{const r=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),r?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}function ve(e){return ue({...e,state:!0,attribute:!1})}const me="lightener-curve-card",_e="custom:lightener-curve-card";function fe(e,t){return"light"===t.split(".")[0]&&"lightener"===e.entities?.[t]?.platform}function be(e,t){customElements.get(e)||customElements.define(e,t)}class ye{constructor(e,t){this.isConnected=e,this.requestUpdate=t,this.ready=!1,this.started=!1}ensureLoaded(){if(this.started)return;if(this.started=!0,customElements.get("ha-entity-picker"))return void(this.ready=!0);(async()=>{try{const e=window.loadCardHelpers;"function"==typeof e&&await e()}catch{}try{const e=customElements.get("hui-entities-card");await(e?.getConfigElement?.())}catch{}})();const e=customElements.whenDefined("ha-entity-picker"),t=new Promise(e=>setTimeout(e,1500));Promise.race([e,t]).then(()=>{this.isConnected()&&(this.ready=!!customElements.get("ha-entity-picker"),this.ready||(console.warn("[lightener] <ha-entity-picker> not available — falling back to plain input."),customElements.whenDefined("ha-entity-picker").then(()=>{this.isConnected()&&(this.ready=!0,this.requestUpdate())}).catch(()=>{})),this.requestUpdate())}).catch(()=>{})}}function xe(e){return{...e,controlPoints:e.controlPoints.map(e=>({...e}))}}function we(e){return e.map(xe)}function $e(e,t){if(e.length!==t.length)return!1;for(let i=0;i<e.length;i++){const r=e[i].controlPoints,n=t[i].controlPoints;if(r.length!==n.length)return!1;for(let e=0;e<r.length;e++){if(r[e].lightener!==n[e].lightener)return!1;if(r[e].target!==n[e].target)return!1}}return!0}function ke(e,t){const i=e.find(e=>e.entityId===t);return!!i&&i.visible}function Pe(e,t){!function(e,t){e.push(we(t)),e.length>50&&e.shift()}(e,t)}function Ce(e,t,i){return function(e,t,i){const r=e[t];if(!r)return null;if(r.controlPoints.length<=2)return null;if(0===i)return null;if(!Number.isInteger(i)||i<0||i>=r.controlPoints.length)return null;const n=[...e],s={...n[t]};return s.controlPoints=s.controlPoints.filter((e,t)=>t!==i),n[t]=s,n}(e,t,i)}function Se(e,t,i){const[r,n]=e,[s,o]=t;return r===n?s:s+(i-r)*(o-s)/(n-r)}function Ae(e){const t=new Map;let i=null;t.set(0,0);for(const r of e)0!==r.lightener||0===r.target?t.set(r.lightener,r.target):i=r.target;if(null===i||t.has(1)||t.set(1,i),!t.has(100)){let e=-1,i=100;for(const[r,n]of t)0!==r&&r>e&&(e=r,i=n);t.set(100,i)}const r=[];for(const[e,i]of t)r.push({lightener:e,target:i});return r.sort((e,t)=>e.lightener-t.lightener),r}function Ee(e,t){return function(e,t){if(0===e.length)return 0;const i=Math.max(0,Math.min(100,t));if(i<=e[0].lightener)return e[0].target;for(let t=1;t<e.length;t++){const r=e[t-1],n=e[t];if(i===n.lightener)return n.target;if(i<n.lightener)return Se([r.lightener,n.lightener],[r.target,n.target],i)}return e[e.length-1].target}(Ae(e),t)}const Ie=44,Te=12,Me=300,Le=200,De=356;function Re(e){return Ie+e/100*Me}function Ge(e){return Te+(1-e/100)*Le}function Ue(e,t,i){return Math.max(t,Math.min(i,e))}function ze(e){const t=e.length;if(0===t)return{dx:[],tangents:[]};if(1===t)return{dx:[],tangents:[0]};const i=[],r=[],n=[];for(let s=0;s<t-1;s++)i.push(e[s+1].x-e[s].x),r.push(e[s+1].y-e[s].y),n.push(0===i[s]?0:r[s]/i[s]);const s=new Array(t).fill(0);if(2===t)return s[0]=n[0],s[1]=n[0],{dx:i,tangents:s};s[0]=n[0],s[t-1]=n[t-2];for(let e=1;e<t-1;e++)0===n[e-1]||0===n[e]||n[e-1]*n[e]<=0?s[e]=0:s[e]=(n[e-1]+n[e])/2;for(let e=0;e<t-1;e++){if(0===n[e]){s[e]=0,s[e+1]=0;continue}const t=s[e]/n[e],i=s[e+1]/n[e],r=t*t+i*i;if(r>9){const o=3/Math.sqrt(r);s[e]=o*t*n[e],s[e+1]=o*i*n[e]}}return{dx:i,tangents:s}}function Ne(e,t){return Math.max(0,Math.min(100,Ee(e,t)))}function Oe(e,t){const i=Ae(e).map(e=>({x:e.lightener,y:e.target}));return Math.max(0,Math.min(100,function(e,t){if(e.length<2)return 0;if(2===e.length){const[i,r]=e,n=r.x-i.x;if(0===n)return i.y;const s=(t-i.x)/n;return i.y+s*(r.y-i.y)}const{dx:i,tangents:r}=ze(e);let n=0;for(let i=0;i<e.length-1;i++){if(t<=e[i+1].x){n=i;break}n=i}const s=i[n]||1,o=Ue((t-e[n].x)/s,0,1),a=s/3,l=1-o;return l*l*l*e[n].y+3*l*l*o*(e[n].y+r[n]*a)+3*l*o*o*(e[n+1].y-r[n+1]*a)+o*o*o*e[n+1].y}(i,t)))}const Be=["#42a5f5","#ef5350","#5c6bc0","#ffa726","#ab47bc","#1565c0","#ec407a","#8d6e63","#ffca28","#7e57c2"];function He(e){if(e.length<2)return"";if(2===e.length)return`M${e[0].x},${e[0].y} L${e[1].x},${e[1].y}`;const{dx:t,tangents:i}=ze(e);let r=`M${e[0].x},${e[0].y}`;for(let n=0;n<e.length-1;n++){const s=t[n]/3;r+=` C${e[n].x+s},${e[n].y+i[n]*s} ${e[n+1].x-s},${e[n+1].y-i[n+1]*s} ${e[n+1].x},${e[n+1].y}`}return r}const je=["","8 4","4 4","12 4 4 4","2 4"],Fe=["circle","square","diamond","triangle","bar"];const qe=.25;class Ve{constructor(e,t=300){this._host=e,this._intervalMs=t,this._active=!1,this._rafPending=!1,this._trailingTimer=null,this._restoreBrightness=new Map,this._lastBrightness=new Map,this._frameGeneration=0,this._pending=null,this.lastPreviewTime=0}get active(){return this._active}start(){const e=this._host.getHass();if(e&&!this._active){if(this._active=!0,this._host.setPreviewActive(!0),null===this._host.getScrubberPosition()){this._host.setScrubberPosition(50);const e=this._host.getStorageEntityId();e&&this._host.persistScrubberPosition(e,50)}this._restoreBrightness.clear(),this._lastBrightness.clear();for(const t of this._host.getCurves()){if(!t.visible)continue;const i=e.states[t.entityId];i&&this._restoreBrightness.set(t.entityId,"off"===i.state?null:i.attributes.brightness??void 0)}this.refresh(!0)}}stop(){if(!this._active)return;this._active=!1,this._host.setPreviewActive(!1),this._rafPending=!1,this._frameGeneration++,this._clearTrailingTimer();const e=this._host.getHass();if(e)for(const[t,i]of this._restoreBrightness)null===i?e.callService("light","turn_off",{entity_id:t,transition:qe}).catch(()=>{}):void 0===i?e.callService("light","turn_on",{entity_id:t,transition:qe}).catch(()=>{}):e.callService("light","turn_on",{entity_id:t,brightness:i,transition:qe}).catch(()=>{});this._restoreBrightness.clear(),this._lastBrightness.clear()}disconnect(){this.stop(),this._clearTrailingTimer(),this._rafPending=!1,this._pending=null,this._frameGeneration++}refresh(e=!1){this._active&&(null===this._host.getScrubberPosition()&&this._host.setScrubberPosition(50),this.previewLights(this._host.getScrubberPosition()??50,e))}previewLights(e,t=!1){this._schedule({position:e,entityId:null},t)}previewSingleLight(e,t,i=!1,r){this._schedule({position:t,entityId:e,value:r},i)}_schedule(e,t){const i=this._host.getHass();if(!this._active||!i)return;this._pending=e,t&&(this.lastPreviewTime=0,this._rafPending=!1,this._frameGeneration++,null===e.entityId?this._lastBrightness.clear():this._lastBrightness.delete(e.entityId),this._clearTrailingTimer());const r=Date.now()-this.lastPreviewTime;if(r<this._intervalMs)return void(this._trailingTimer||(this._trailingTimer=setTimeout(()=>{this._trailingTimer=null,null!==this._pending&&this._schedule(this._pending,!1)},this._intervalMs-r)));if(this._rafPending)return;this._clearTrailingTimer(),this._rafPending=!0;const n=this._frameGeneration;requestAnimationFrame(()=>{if(n!==this._frameGeneration)return;this._rafPending=!1;const t=this._host.getHass();if(!this._active||!t)return;this.lastPreviewTime=Date.now();const i=this._pending??e;if(null===i.entityId)for(const e of this._host.getCurves())e.visible&&this._pushCurve(t,e,i.position);else{const e=this._host.getCurves().find(e=>e.entityId===i.entityId);e&&e.visible&&this._pushCurve(t,e,i.position,i.value)}})}_pushCurve(e,t,i,r){this._ensureRestoreSnapshot(e,t.entityId);const n=Math.round(Math.max(0,Math.min(100,r??Ne(t.controlPoints,i)))),s=Math.round(n/100*255);if(0===s){if("off"===this._lastBrightness.get(t.entityId))return;this._lastBrightness.set(t.entityId,"off"),e.callService("light","turn_off",{entity_id:t.entityId,transition:qe}).catch(()=>{})}else{if(this._lastBrightness.get(t.entityId)===s)return;this._lastBrightness.set(t.entityId,s),e.callService("light","turn_on",{entity_id:t.entityId,brightness:s,transition:qe}).catch(()=>{})}}_ensureRestoreSnapshot(e,t){if(this._restoreBrightness.has(t))return;const i=e.states[t];i&&this._restoreBrightness.set(t,"off"===i.state?null:i.attributes.brightness??void 0)}_clearTrailingTimer(){this._trailingTimer&&(clearTimeout(this._trailingTimer),this._trailingTimer=null)}}const Ke={title:"Try brightness",sliderAria:"Try group brightness",watchButton:"Watch room react",watchingPrefix:"Watching",watchingRestore:"Put it back",heldStatus:"Your room is showing this now",heldStatusSave:"Save to keep it"},We={save:"Save",saving:"Saving…",savePreview:"Save this room"},Xe={panelAria:"Shapes for selected light",title:"Shapes",emptyTitle:"Pick a light to shape it.",emptyBody:"Shapes apply to one light at a time.",forLight:e=>`Shapes for ${e}`,explanation:"Pick a starting shape, then fine-tune it on the graph.",trying:e=>`Trying ${e}`,chooseForLight:e=>`Choose it to shape ${e}.`,defs:{linear:{name:"Equal brightness",description:"Matches the group brightness."},dim_accent:{name:"Dim accent",description:"Rises gently, capped near 45%."},late_starter:{name:"Late starter",description:"Stays dim until 45%, then brightens fast."},night_mode:{name:"Night mode",description:"Caps near 25%, even at full group brightness."}}},Ye={title:"Lights",emptyCount:"No lights yet",removeToggle:"Remove a light",removeDone:"Done",countAllVisible:e=>`${e} ${1===e?"light":"lights"} showing`,countWithHidden:(e,t)=>`${e} ${1===e?"light":"lights"} · ${t} hidden`,listAria:e=>0===e?"No lights in this group":`${e} ${1===e?"light":"lights"} in this group`},Je={yAxisLabel:"Per-light brightness"},Ze={railAria:"Room lights and shapes",loading:"Loading brightness shapes…"},Qe=[{id:"linear",...Xe.defs.linear,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}]},{id:"dim_accent",...Xe.defs.dim_accent,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:25,target:8},{lightener:50,target:20},{lightener:100,target:45}]},{id:"late_starter",...Xe.defs.late_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:45,target:1},{lightener:70,target:45},{lightener:100,target:100}]},{id:"night_mode",...Xe.defs.night_mode,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:20,target:3},{lightener:50,target:10},{lightener:100,target:25}]}];function et(e){return`${e} light${1===e?"":"s"}`}function tt(e){return[...e].sort((e,t)=>e.lightener-t.lightener).map(e=>`${e.lightener}:${e.target}`).join("|")}function it(e,t){if(!e.length)return null;const i=e.filter(e=>e.visible),r=e.length;if(!i.length)return{primary:"All lights are hidden",secondary:"Show a light in the list to bring its shape back.",visibleCount:0,totalCount:r,shapeCount:0,largestShapeCount:0};const n=function(e){const t=new Map;for(const i of e){const e=tt(i.controlPoints),r=t.get(e)??[];r.push(i),t.set(e,r)}return t}(i),s=function(e){let t=[];for(const i of e.values())i.length>t.length&&(t=i);return t}(n),o=n.size,a=r-i.length,l=a>0?` ${a} hidden light${1===a?"":"s"}.`:"";if(t){const e=i.find(e=>e.entityId===t);if(e){const t=n.get(tt(e.controlPoints))??[e],a=Math.max(0,t.length-1);return{primary:`Shaping ${e.friendlyName}`,secondary:a>0?`${et(a)} still share${1===a?"s":""} this shape.${l}`:`This light has its own shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:s.length}}}if(1===o&&i.length>1){return{primary:!!(d=s[0]?.controlPoints??[]).length&&d.every(e=>e.lightener===e.target)?`${et(i.length)} match the group brightness`:`${et(i.length)} share one brightness shape`,secondary:`Pick a light to give it its own shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:s.length}}var d;return o===i.length?{primary:`${et(i.length)}, ${o} separate shapes`,secondary:`Pick a light to focus its shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:s.length}:{primary:`${et(i.length)}, ${o} brightness shapes`,secondary:`${et(s.length)} share the most common shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:o,largestShapeCount:s.length}}function rt(e){return e.ready?q`<ha-entity-picker
      .hass=${e.hass}
      .value=${e.value}
      .includeDomains=${e.includeDomains}
      .includeEntities=${e.includeEntities}
      .excludeEntities=${e.excludeEntities??[]}
      allow-custom-entity
      @value-changed=${e.onValueChanged}
    ></ha-entity-picker>`:"change"===(e.fallbackEvent??"input")?q`<input
        type="text"
        .value=${e.value}
        placeholder=${e.placeholder??W}
        @change=${e.onFallbackInput}
      />`:q`<input
        type="text"
        .value=${e.value}
        placeholder=${e.placeholder??W}
        @input=${e.onFallbackInput}
      />`}function nt(e){return q`<svg
    class="preset-thumb"
    viewBox="0 0 64 40"
    width="64"
    height="40"
    aria-hidden="true"
  >
    <polyline
      points=${function(e){return e.controlPoints.map(e=>{const t=4+e.lightener/100*56,i=36-e.target/100*32;return`${t.toFixed(1)},${i.toFixed(1)}`}).join(" ")}(e)}
      fill="none"
      stroke="var(--accent, #2563eb)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></polyline>
  </svg>`}const st={phase:"idle"};class ot{constructor(e,t=8e3,i=2e3){this._host=e,this._confirmTimeoutMs=t,this._successDisplayMs=i,this._confirmTimer=null,this._successTimer=null,this._generation=0,this._resolve=null}currentGeneration(){return this._generation}arm(){const e=++this._generation;this._clearConfirmTimer(),this._settle("error");const t=new Promise(t=>{this._resolve=t,this._confirmTimer=setTimeout(()=>{this._confirmTimer=null,this._generation===e&&"confirming"===this._host.getSavePhase()&&this._host.dispatchSave({type:"save-error",message:"Save confirmation timed out."})},this._confirmTimeoutMs)});return{generation:e,settled:t}}confirm(e){"confirming"===this._host.getSavePhase()&&e===this._generation&&(this._host.dispatchSave({type:"save-confirmed"}),this._clearSuccessTimer(),this._successTimer=setTimeout(()=>{this._successTimer=null,this._host.dispatchSave({type:"save-clear"})},this._successDisplayMs))}fail(e,t){"confirming"===this._host.getSavePhase()&&e===this._generation&&this._host.dispatchSave({type:"save-error",message:t})}onLeaveConfirming(e,t){this._clearConfirmTimer(),t&&this._settle("error"===e?"error":"confirmed")}settleError(){this._settle("error")}dispose(){this._clearSuccessTimer(),this._clearConfirmTimer(),this._settle("error")}_settle(e){const t=this._resolve;t&&(this._resolve=null,t(e))}_clearConfirmTimer(){this._confirmTimer&&(clearTimeout(this._confirmTimer),this._confirmTimer=null)}_clearSuccessTimer(){this._successTimer&&(clearTimeout(this._successTimer),this._successTimer=null)}}const at={loaded:!1,loading:!1,loadError:null};function lt(e,t){const i={...e,loaded:!1};return i.loading?{state:{...i,reloadAfterLoadEntityId:t},runNow:!1}:{state:i,runNow:!0}}function dt(e){return{...e,loaded:!1,loadedEntityId:void 0}}const ct=a`(max-width: ${o(500)}px)`;class ht extends ce{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.entityId=null,this.readOnly=!1,this.scrubberPosition=null,this.previewCurve=null,this._dragCurveIdx=-1,this._dragPointIdx=-1,this._hoveredPoint=null,this._focusedPoint=null,this._isMobile=!1,this._uid=Math.random().toString(36).slice(2,7),this._mql=null,this._wasDragging=!1,this._longPressTimer=null,this._longPressFired=!1,this._onMqlChange=e=>{this._isMobile=e.matches}}_getSvgCoords(e){const t=this._svgRef;if(!t)return null;const i=t.getScreenCTM();if(!i)return null;let r;try{r=i.inverse()}catch{return null}if(!r||isNaN(r.a))return null;const n=t.createSVGPoint();n.x=e.clientX,n.y=e.clientY;const s=n.matrixTransform(r);return{x:(a=s.x,(a-Ie)/Me*100),y:(o=s.y,100*(1-(o-Te)/Le))};var o,a}_isCurveInteractive(e){return!this.readOnly&&(null===this.selectedCurveId||this.curves[e]?.entityId===this.selectedCurveId)}_focusCurve(e){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:e},bubbles:!0,composed:!0}))}_onPointFocus(e,t){const i=this.curves[e];i&&(this._focusedPoint={curve:e,point:t},this._hoveredPoint={curve:e,point:t},this._focusCurve(i.entityId))}_onPointBlur(e,t){this._focusedPoint?.curve===e&&this._focusedPoint?.point===t&&(this._focusedPoint=null),this._hoveredPoint?.curve===e&&this._hoveredPoint?.point===t&&(this._hoveredPoint=null)}_dispatchKeyboardMove(e,t,i,r){this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:e,pointIndex:t,lightener:i,target:r},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:e,pointIndex:t},bubbles:!0,composed:!0}))}_getKeyboardInsertPoint(e,t){const i=e.controlPoints[t],r=e.controlPoints[t+1],n=e.controlPoints[t-1];return r&&r.lightener-i.lightener>1?{lightener:Math.round((i.lightener+r.lightener)/2),target:Math.round((i.target+r.target)/2)}:n&&i.lightener-n.lightener>1?{lightener:Math.round((n.lightener+i.lightener)/2),target:Math.round((n.target+i.target)/2)}:null}_onPointKeyDown(e,t,i){const r=this.curves[t],n=r?.controlPoints[i];if(!r||!n)return;if(this.selectedCurveId!==r.entityId&&this._focusCurve(r.entityId),0===i&&("ArrowRight"===e.key||"ArrowLeft"===e.key))return;const s=e.shiftKey?10:1,o=i>0?r.controlPoints[i-1].lightener+1:n.lightener,a=i<r.controlPoints.length-1?r.controlPoints[i+1].lightener-1:100;if("ArrowRight"===e.key)return e.preventDefault(),void this._dispatchKeyboardMove(t,i,Math.min(a,n.lightener+s),n.target);if("ArrowLeft"===e.key)return e.preventDefault(),void this._dispatchKeyboardMove(t,i,Math.max(o,n.lightener-s),n.target);if("ArrowUp"===e.key)return e.preventDefault(),void this._dispatchKeyboardMove(t,i,n.lightener,Math.min(100,n.target+s));if("ArrowDown"===e.key)return e.preventDefault(),void this._dispatchKeyboardMove(t,i,n.lightener,Math.max(0,n.target-s));if("Enter"===e.key){const n=this._getKeyboardInsertPoint(r,i);if(!n)return;return e.preventDefault(),this.dispatchEvent(new CustomEvent("point-add",{detail:{entityId:r.entityId,lightener:n.lightener,target:n.target},bubbles:!0,composed:!0})),void this.updateComplete.then(()=>this._refocusHitCircle(t,i)).catch(()=>{})}(" "===e.key||"Delete"===e.key||"Backspace"===e.key)&&i>0&&r.controlPoints.length>2&&(e.preventDefault(),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:t,pointIndex:i},bubbles:!0,composed:!0})),this.updateComplete.then(()=>this._refocusHitCircle(t,Math.max(1,i-1))).catch(()=>{}))}_refocusHitCircle(e,t){const i=this.renderRoot.querySelector(`.hit-circle[data-curve="${e}"][data-point="${t}"]`);i&&i.focus()}_onPointerDown(e,t,i){0===e.button&&this._isCurveInteractive(t)&&(e.preventDefault(),this._longPressFired=!1,this._clearLongPress(),i>0&&(this._longPressTimer=setTimeout(()=>{this._longPressFired=!0,this._dragCurveIdx=-1,this._dragPointIdx=-1,this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:t,pointIndex:i},bubbles:!0,composed:!0}))},500)),this._svgRef?.setPointerCapture(e.pointerId),this._dragCurveIdx=t,this._dragPointIdx=i)}_clearLongPress(){this._longPressTimer&&(clearTimeout(this._longPressTimer),this._longPressTimer=null)}_onPointerMove(e){if(this._dragCurveIdx<0)return;e.preventDefault(),this._clearLongPress();const t=this._getSvgCoords(e);if(!t)return;const i=this.curves[this._dragCurveIdx],r=i?.controlPoints??[],n=this._dragPointIdx>0?r[this._dragPointIdx-1].lightener+1:1,s=this._dragPointIdx<r.length-1?r[this._dragPointIdx+1].lightener-1:100,o=0===this._dragPointIdx?this.curves[this._dragCurveIdx]?.controlPoints[0]?.lightener??0:Math.round(Ue(t.x,n,s)),a=Math.round(Ue(t.y,0,100));this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx,lightener:o,target:a},bubbles:!0,composed:!0}))}_onPointerUp(e){this._clearLongPress(),this._longPressFired||this._dragCurveIdx<0||(e.preventDefault(),this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx},bubbles:!0,composed:!0})),this._dragCurveIdx=-1,this._dragPointIdx=-1,this._wasDragging=!0,setTimeout(()=>{this._wasDragging=!1},400))}_onPointContextMenu(e,t,i){e.preventDefault(),e.stopPropagation(),this.readOnly||this._isCurveInteractive(t)&&0!==i&&this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:t,pointIndex:i},bubbles:!0,composed:!0}))}_onDblClick(e){if(this.readOnly)return;if(this._wasDragging)return;const t=this._getSvgCoords(e);if(!t)return;const i=Math.round(Ue(t.x,1,100)),r=Math.round(Ue(t.y,0,100));this.dispatchEvent(new CustomEvent("point-add",{detail:{lightener:i,target:r,entityId:this.selectedCurveId},bubbles:!0,composed:!0}))}_renderGrid(){return V`
      <defs>
        <clipPath id="graph-area-${this._uid}">
          <rect x="${14}" y="${-18}" width="${360}" height="${260}" />
        </clipPath>
      </defs>

      <rect class="plot-frame"
        x="${Ie}" y="${Te}"
        width="${Me}" height="${Le}" />

      ${[0,25,50,75,100].map(e=>V`
        <!-- Vertical grid -->
        <line class="grid-line"
          x1="${Re(e)}" y1="${Ge(0)}"
          x2="${Re(e)}" y2="${Ge(100)}" />
        <!-- Horizontal grid -->
        <line class="grid-line"
          x1="${Re(0)}" y1="${Ge(e)}"
          x2="${Re(100)}" y2="${Ge(e)}" />
        <!-- X tick labels -->
        <text class="tick-label" text-anchor="middle"
          x="${Re(e)}" y="${228}">${e}%</text>
        <!-- Y tick labels -->
        <text class="tick-label" text-anchor="end" dominant-baseline="middle"
          x="${38}" y="${Ge(e)}">${e}%</text>
      `)}

      <!-- Axis border lines -->
      <line class="axis-line"
        x1="${Ie}" y1="${Ge(0)}"
        x2="${344}" y2="${Ge(0)}" />
      <line class="axis-line"
        x1="${Ie}" y1="${Ge(0)}"
        x2="${Ie}" y2="${Ge(100)}" />

      <!-- Axis labels: x-axis is labeled by the slider above the graph; the
           y-axis label stays inline (no other surface labels it). -->
      <text class="axis-label" text-anchor="middle"
        transform="rotate(-90, 10, ${112})"
        x="10" y="${112}">${Je.yAxisLabel}</text>
    `}_renderCrossHair(e){if(this._dragCurveIdx<0)return W;const t=e.controlPoints[this._dragPointIdx];if(!t)return W;const i=Re(t.lightener),r=Ge(t.target);return V`
      <line class="crosshair"
        x1="${i}" y1="${r}"
        x2="${i}" y2="${Ge(0)}"
        stroke="${e.color}" opacity="0.5" />
      <line class="crosshair"
        x1="${i}" y1="${r}"
        x2="${Ie}" y2="${r}"
        stroke="${e.color}" opacity="0.5" />
    `}_renderTooltip(e){const t=Re(e.lightener),i=Ge(e.target),r=`Group ${e.lightener}% -> Light ${e.target}%`,n=Math.ceil(4.9*r.length),s=Ue(t-n/2-2,Ie,344-n-8),o=Math.max(16,i-16);return V`
      <rect class="tooltip-bg"
        x="${s}" y="${o-8}"
        width="${n+8}" height="14" />
      <text class="tooltip-text" text-anchor="start"
        x="${s+4}" y="${o+2}">${r}</text>
    `}_renderScrubberIndicator(){if(null===this.scrubberPosition)return W;const e=this.scrubberPosition,t=Re(e),i=V`
      <rect
        x="${t}" y="${Ge(100)}"
        width="${Re(100)-t}" height="${Le}"
        fill="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))"
        fill-opacity="0.93"
        pointer-events="none"
      />
    `,r=V`
      <line class="scrubber-line"
        x1="${t}" y1="${Ge(0)}"
        x2="${t}" y2="${Ge(100)}" />
    `,n=this.curves.filter(e=>e.visible).map(i=>{const r=Ge(Oe(i.controlPoints,e));return V`
          <circle
            class="scrubber-dot"
            cx="${t}" cy="${r}"
            r="4"
            fill="${i.color}"
            filter="url(#scrubber-glow-${i.color.replace("#","")}-${this._uid})"
            pointer-events="none"
          />
        `});return V`${i}${r}${n}`}_orderedCurves(){const e=this.selectedCurveId?this.curves.findIndex(e=>e.entityId===this.selectedCurveId):-1;return e>=0?[...this.curves.slice(0,e).map((e,t)=>({curve:e,idx:t})),...this.curves.slice(e+1).map((t,i)=>({curve:t,idx:e+1+i})),{curve:this.curves[e],idx:e}]:this.curves.map((e,t)=>({curve:e,idx:t}))}_renderCurvePaths(e,t){if(!e.visible||!e.controlPoints.length)return W;try{const i=null===this.selectedCurveId||e.entityId===this.selectedCurveId,r=this._dragCurveIdx===t,n=i?1:.2,s=Ae(e.controlPoints),o=He(s.map(e=>({x:Re(e.lightener),y:Ge(e.target)}))),a=o+` L${Re(s[s.length-1].lightener)},${Ge(0)}`+` L${Re(0)},${Ge(0)} Z`,l=`grad-${t}-${this._uid}`,d=null===this.selectedCurveId?je[t%je.length]:e.entityId===this.selectedCurveId?"":je[t%(je.length-1)+1],c=null!==this.selectedCurveId&&e.entityId===this.selectedCurveId;return V`
        ${c?V`
              <defs>
                <linearGradient id="${l}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${e.color}" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="${e.color}" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <path
                d="${a}"
                fill="url(#${l})"
                style="opacity: ${n}"
                pointer-events="none"
              />`:W}
        ${r?this._renderCrossHair(e):W}
        <path
          class="curve-line"
          d="${o}"
          stroke="${e.color}"
          stroke-dasharray="${d}"
          style="opacity: ${n}"
          pointer-events="none"
        />
      `}catch{return W}}_renderCurvePoints(e,t){if(!e.visible||!e.controlPoints.length)return W;try{const i=this._isCurveInteractive(t);if(!(i&&!this.readOnly))return W;const r=this._dragCurveIdx===t,n=e.color+"33";let s=null;if(r&&this._dragPointIdx>=0)s=e.controlPoints[this._dragPointIdx];else if(this._hoveredPoint?.curve===t||this._focusedPoint?.curve===t){const i=this._focusedPoint?.curve===t?this._focusedPoint.point:this._hoveredPoint?.point??-1;s=e.controlPoints[i]??null}return V`
        ${e.controlPoints.map((i,s)=>{const o=0===s,a=r&&this._dragPointIdx===s,l=this._hoveredPoint?.curve===t&&this._hoveredPoint?.point===s,d=null!==this.scrubberPosition&&i.lightener>this.scrubberPosition?.35:1;return V`
            <circle
              class="hit-circle ${o?"origin-hit":""}"
              data-curve="${t}"
              data-point="${s}"
              cx="${Re(i.lightener)}"
              cy="${Ge(i.target)}"
              r="${this._isMobile?28:22}"
              fill="transparent"
              pointer-events="all"
              tabindex="0"
              role="button"
              aria-label="${e.friendlyName} point ${i.lightener}% group brightness to ${i.target}% light brightness. ${0===s?"Arrow Up/Down to adjust starting brightness. Cannot be moved horizontally.":"Arrow keys move, Enter adds a nearby point, Space removes."}"
              style="touch-action: none; -webkit-touch-callout: none"
              @pointerdown=${e=>this._onPointerDown(e,t,s)}
              @contextmenu=${e=>this._onPointContextMenu(e,t,s)}
              @pointerenter=${()=>this._hoveredPoint={curve:t,point:s}}
              @pointerleave=${()=>this._hoveredPoint=null}
              @pointercancel=${()=>{this._hoveredPoint=null,this._focusedPoint=null}}
              @focus=${()=>this._onPointFocus(t,s)}
              @blur=${()=>this._onPointBlur(t,s)}
              @keydown=${e=>this._onPointKeyDown(e,t,s)}
            />
            ${function(e,t,i,r,n,s,o,a,l){const d=`--glow-color: ${l}; opacity: ${a}`;switch(e){case"circle":return V`<circle
        class="${n}"
        cx="${t}"
        cy="${i}"
        r="${r}"
        fill="${s}"
        stroke="${o}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`;case"square":{const e=1.15*r;return V`<rect
        class="${n}"
        x="${t-e/2}"
        y="${i-e/2}"
        width="${e}"
        height="${e}"
        rx="1.5"
        fill="${s}"
        stroke="${o}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}case"diamond":{const e=1.3*r;return V`<rect
        class="${n}"
        x="${t-e/2}"
        y="${i-e/2}"
        width="${e}"
        height="${e}"
        rx="1"
        transform="rotate(45 ${t} ${i})"
        fill="${s}"
        stroke="${o}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}case"triangle":{const e=1.15*r,a=1.3*r;return V`<polygon
        class="${n}"
        points="${t},${i-e} ${t-a},${i+.65*e} ${t+a},${i+.65*e}"
        fill="${s}"
        stroke="${o}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}case"bar":{const e=2*r,a=.75*r;return V`<rect
        class="${n}"
        x="${t-e/2}"
        y="${i-a/2}"
        width="${e}"
        height="${a}"
        rx="1.5"
        fill="${s}"
        stroke="${o}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}default:return e}}(Fe[t%Fe.length],Re(i.lightener),Ge(i.target),6,`control-point ${o?"origin":""} ${a?"dragging":""} ${l?"hovered":""} ${this._focusedPoint?.curve===t&&this._focusedPoint?.point===s?"focused":""}`,n,e.color,d,e.color)}
          `})}
        ${null!==s?this._renderTooltip(s):W}
      `}catch{return W}}connectedCallback(){super.connectedCallback(),this._mql=window.matchMedia("(max-width: 500px)"),this._isMobile=this._mql.matches,this._mql.addEventListener("change",this._onMqlChange)}disconnectedCallback(){super.disconnectedCallback(),this._clearLongPress(),this._mql?.removeEventListener("change",this._onMqlChange),this._mql=null}_getSvgDescription(){const e=this.curves.filter(e=>e.visible);if(!e.length)return"No curves displayed";const t=e.map(e=>{const t=e.controlPoints.reduce((e,t)=>Number.isFinite(t.target)?Math.max(e,t.target):e,0);return`${e.friendlyName} (${e.controlPoints.length} points, max ${t}%)`});return`${e.length} curve${1===e.length?"":"s"}: ${t.join(", ")}`}_renderCenteredHintBand(e,t,i,r){return V`
      <rect
        class="hint-band"
        x="${194-e/2}"
        y="${i-t/2}"
        width="${e}"
        height="${t}"
        rx="8"
        pointer-events="none"
      />
      ${r}
    `}_renderPreviewCurve(){const e=this.previewCurve;if(!e||!e.controlPoints.length)return W;try{const t=Ae(e.controlPoints),i=He(t.map(e=>({x:Re(e.lightener),y:Ge(e.target)}))),r=null!==this.scrubberPosition?V`
              <circle
                class="preview-curve-point"
                r="4.5"
                cx="${Re(this.scrubberPosition)}"
                cy="${Ge(Oe(e.controlPoints,this.scrubberPosition))}"
              />`:W;return V`
        <g
          class="preview-curve"
          clip-path="url(#graph-area-${this._uid})"
          style="--preview-color: ${e.color}"
        >
          <path
            class="preview-curve-line"
            d="${i}"
            stroke="${e.color}"
          />
          ${r}
        </g>
      `}catch{return W}}render(){return q`
      <svg
        viewBox="0 0 ${De} ${248}"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Brightness curve editor graph"
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @lostpointercapture=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
        @dblclick=${this._onDblClick}
        @contextmenu=${e=>{this.readOnly||e.preventDefault()}}
      >
        <desc>${this._getSvgDescription()}</desc>
        ${this._renderGrid()}

        <!-- Invisible hit area for double-click -->
        ${this.readOnly?W:q`<rect
              class="hit-area"
              x="${Ie}"
              y="${Te}"
              width="${Me}"
              height="${Le}"
              pointer-events="all"
              fill="transparent"
            />`}
        <!-- Phase 1: curve fills and lines (rendered before scrubber overlay) -->
        ${(()=>{const e=this._orderedCurves();return V`<g clip-path="url(#graph-area-${this._uid})">${e.map(({curve:e,idx:t})=>this._renderCurvePaths(e,t))}</g>`})()}
        <!-- Scrubber glow filters (only re-render when curves change, not on every position update) -->
        <defs>
          ${this.curves.filter(e=>e.visible).map(e=>{const t=`scrubber-glow-${e.color.replace("#","")}-${this._uid}`;return V`
              <filter id="${t}" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feFlood flood-color="${e.color}" flood-opacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>`})}
        </defs>
        ${this._renderScrubberIndicator()} ${this._renderPreviewCurve()}
        <!-- Phase 3: control points rendered after scrubber overlay so they are always visible -->
        ${(()=>{const e=this._orderedCurves();return V`<g clip-path="url(#graph-area-${this._uid})">${e.map(({curve:e,idx:t})=>this._renderCurvePoints(e,t))}</g>`})()}
        ${(()=>{if(this.readOnly)return W;if(0===this.curves.length){const e=112;return this._renderCenteredHintBand(220,32,e,V`<text class="hint hint-select" text-anchor="middle"
                x="${194}" y="${e+4}"
                pointer-events="none"
                >Add a light below to get started</text>`)}return W})()}
      </svg>
    `}}ht.styles=a`
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
    .preview-curve-line {
      fill: none;
      stroke-width: 4.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 7 9;
      opacity: 0.95;
      filter: drop-shadow(0 0 6px var(--preview-color, #42a5f5));
      animation:
        preview-dash 0.9s linear infinite,
        preview-glow 1.35s ease-in-out infinite;
      pointer-events: none;
    }
    .preview-curve-point {
      fill: var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)));
      stroke: var(--preview-color, #42a5f5);
      stroke-width: 3;
      opacity: 0.95;
      filter: drop-shadow(0 0 7px var(--preview-color, #42a5f5));
      animation: preview-point 1.1s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes preview-dash {
      from {
        stroke-dashoffset: 0;
      }
      to {
        stroke-dashoffset: -16;
      }
    }
    @keyframes preview-glow {
      0%,
      100% {
        opacity: 0.66;
      }
      50% {
        opacity: 1;
      }
    }
    @keyframes preview-point {
      0%,
      100% {
        r: 4.5;
        opacity: 0.62;
      }
      50% {
        r: 7;
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .preview-curve-line,
      .preview-curve-point {
        animation: none;
      }
    }
    .control-point {
      cursor: grab;
      transition:
        r 0.15s ease,
        filter 0.15s ease;
    }
    .control-point:hover,
    .control-point.hovered,
    .control-point.focused {
      r: 7.5;
      filter: drop-shadow(0 0 6px var(--glow-color, #42a5f5));
    }
    .control-point.dragging {
      cursor: grabbing;
      r: 8;
      filter: drop-shadow(0 0 8px var(--glow-color, #42a5f5));
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
    @media ${ct} {
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
  `,e([ue({type:Array})],ht.prototype,"curves",void 0),e([ue({type:String})],ht.prototype,"selectedCurveId",void 0),e([ue({type:String})],ht.prototype,"entityId",void 0),e([ue({type:Boolean})],ht.prototype,"readOnly",void 0),e([ue({type:Number})],ht.prototype,"scrubberPosition",void 0),e([ue({attribute:!1})],ht.prototype,"previewCurve",void 0),e([ve()],ht.prototype,"_dragCurveIdx",void 0),e([ve()],ht.prototype,"_dragPointIdx",void 0),e([ve()],ht.prototype,"_hoveredPoint",void 0),e([ve()],ht.prototype,"_focusedPoint",void 0),e([ve()],ht.prototype,"_isMobile",void 0),e([function(e){return(t,i,r)=>((e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof t&&Object.defineProperty(e,t,i),i))(t,i,{get(){return(t=>t.renderRoot?.querySelector(e)??null)(this)}})}("svg")],ht.prototype,"_svgRef",void 0),be("curve-graph",ht);class pt extends ce{constructor(){super(...arguments),this.curves=[],this.readOnly=!1,this.previewActive=!1,this.canPreview=!1,this.dirty=!1,this.position=null,this._dragging=!1,this._trackRef=null}_onPointerDown(e){this.readOnly||(e.preventDefault(),this._dragging=!0,e.target.setPointerCapture(e.pointerId),this._updatePositionFromClient(e.clientX),this.dispatchEvent(new CustomEvent("scrubber-start",{bubbles:!0,composed:!0})))}_onPointerMove(e){this._dragging&&(e.preventDefault(),this._updatePositionFromClient(e.clientX))}_onPointerUp(){this._dragging&&(this._dragging=!1,this.dispatchEvent(new CustomEvent("scrubber-end",{bubbles:!0,composed:!0})))}_onTrackClick(e){this.readOnly||this._updatePositionFromClient(e.clientX)}_onKeyDown(e){if(this.readOnly)return;const t=e.shiftKey?10:1,i=Math.min(100,Math.max(0,this.position??50));let r;if("ArrowRight"===e.key||"ArrowUp"===e.key)e.preventDefault(),r=Math.min(100,i+t);else if("ArrowLeft"===e.key||"ArrowDown"===e.key)e.preventDefault(),r=Math.max(0,i-t);else if("Home"===e.key)e.preventDefault(),r=0;else{if("End"!==e.key)return;e.preventDefault(),r=100}this._emitPosition(r)}_updatePositionFromClient(e){const t=this._trackRef;if(!t)return;const i=t.getBoundingClientRect(),r=(e-i.left)/i.width*100,n=Math.max(0,Math.min(100,r));this._emitPosition(n)}_emitPosition(e){this.dispatchEvent(new CustomEvent("scrubber-move",{detail:{position:e},bubbles:!0,composed:!0}))}_onPreviewToggle(){this.dispatchEvent(new CustomEvent("preview-toggle",{bubbles:!0,composed:!0}))}firstUpdated(){this._trackRef=this.renderRoot.querySelector(".track-area"),requestAnimationFrame(()=>{this.classList.add("is-loaded")})}render(){const e=Math.min(100,Math.max(0,this.position??50)),t=Math.round(e);return q`
      <div class="scrubber-panel">
        <div class="scrubber-header">
          <div class="scrubber-heading">
            <div class="scrubber-title">${Ke.title}</div>
          </div>
          ${this.canPreview?this.previewActive?q`<button class="preview-toggle-btn active" @click=${this._onPreviewToggle}>
                  <span class="preview-live-dot"></span>
                  ${Ke.watchingPrefix} &nbsp;·&nbsp;
                  <span class="preview-restore-text">${Ke.watchingRestore}</span>
                </button>`:q`<button class="preview-toggle-btn" @click=${this._onPreviewToggle}>
                  ${Ke.watchButton}
                </button>`:W}
        </div>
        ${this.previewActive&&this.dirty?q`<div class="preview-status">
              ${Ke.heldStatus} &nbsp;·&nbsp; ${Ke.heldStatusSave}
            </div>`:W}
        <div
          class="track-area"
          role="slider"
          tabindex="${this.readOnly?-1:0}"
          aria-disabled="${this.readOnly}"
          aria-label=${Ke.sliderAria}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${t}
          aria-valuetext="${t}% group brightness"
          @click=${this._onTrackClick}
          @keydown=${this._onKeyDown}
        >
          <div class="track-bg"></div>
          <div class="track-fill" style="width: ${e}%"></div>
          <div class="position-label" style="left: ${e}%">${t}%</div>
          <div
            class="thumb ${this._dragging?"dragging":""}"
            style="left: ${e}%"
            @pointerdown=${this._onPointerDown}
            @pointermove=${this._onPointerMove}
            @pointerup=${this._onPointerUp}
            @lostpointercapture=${this._onPointerUp}
          ></div>
        </div>
      </div>
    `}}pt.styles=a`
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
      margin-left: ${Ie/De*100}%;
      margin-right: ${12/De*100}%;
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
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--accent) 25%, transparent),
        var(--accent)
      );
      transition: width 0.05s linear;
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
      transition:
        left 0.05s linear,
        box-shadow 0.15s ease;
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
      transition: left 0.05s linear;
    }
    :host(:not(.is-loaded)) .track-fill,
    :host(:not(.is-loaded)) .thumb,
    :host(:not(.is-loaded)) .position-label {
      transition: none;
    }
    @media ${ct} {
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
  `,e([ue({type:Array})],pt.prototype,"curves",void 0),e([ue({type:Boolean})],pt.prototype,"readOnly",void 0),e([ue({type:Boolean})],pt.prototype,"previewActive",void 0),e([ue({type:Boolean})],pt.prototype,"canPreview",void 0),e([ue({type:Boolean})],pt.prototype,"dirty",void 0),e([ue({type:Number})],pt.prototype,"position",void 0),e([ve()],pt.prototype,"_dragging",void 0),be("curve-scrubber",pt);const gt=/[\s\-–—/:]/;class ut extends ce{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.scrubberPosition=null,this.canManage=!1,this.managing=!1,this.manageMode=!1,this.closeRemoveSignal=0,this.closeAddSignal=0,this.groupEntityId=null,this.hass=null,this._confirmingRemove=null,this._confirmingDeleteGroup=!1,this._addingLight=!1,this._pendingAddEntity="",this._pendingPreset=Qe[0]?.id??"linear",this._picker=new ye(()=>this.isConnected,()=>this.requestUpdate())}_select(e){this._confirmingRemove!==e&&this.dispatchEvent(new CustomEvent("select-curve",{detail:{entityId:e},bubbles:!0,composed:!0}))}_toggle(e,t){e.stopPropagation(),this.dispatchEvent(new CustomEvent("toggle-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_clearSelection(e,t){e.stopPropagation(),this._select(t)}willUpdate(e){super.willUpdate(e),!e.has("canManage")&&!e.has("managing")||this.canManage&&!this.managing||(this._confirmingRemove=null,this._confirmingDeleteGroup=!1),e.has("manageMode")&&!this.manageMode&&(this._confirmingDeleteGroup=!1),e.has("closeRemoveSignal")&&(this._confirmingRemove=null),e.has("closeAddSignal")&&this._cancelAdd(),e.has("canManage")&&!this.canManage&&this._cancelAdd()}_startRemove(e,t){e.stopPropagation(),this.canManage&&!this.managing&&(this.curves.length<=1||(this._cancelAdd(),this._confirmingRemove=t,this.dispatchEvent(new CustomEvent("remove-panel-open",{bubbles:!0,composed:!0}))))}_cancelRemove(e){e.stopPropagation(),this._confirmingRemove=null}_confirmRemove(e,t){e.stopPropagation(),this.canManage&&!this.managing?(this._confirmingRemove=null,this.dispatchEvent(new CustomEvent("remove-light",{detail:{entityId:t},bubbles:!0,composed:!0}))):this._confirmingRemove=null}_onItemKeyDown(e,t){if(this._confirmingRemove!==t&&("ArrowDown"===e.key||"ArrowUp"===e.key)){e.preventDefault();const t=[...this.renderRoot.querySelectorAll(".row-select-btn")],i=t.indexOf(e.currentTarget),r="ArrowDown"===e.key?i+1:i-1;t[r]?.focus()}}_onToggleKeyDown(e,t){"Enter"!==e.key&&" "!==e.key||(e.preventDefault(),this._toggle(e,t))}_startAdd(){this.canManage&&!this.managing&&(this._picker.ensureLoaded(),this._confirmingRemove=null,this._confirmingDeleteGroup=!1,this._addingLight=!0,this._pendingAddEntity="",this._pendingPreset=Qe[0]?.id??"linear",this.dispatchEvent(new CustomEvent("add-panel-open",{bubbles:!0,composed:!0})))}_cancelAdd(){this._addingLight=!1,this._pendingAddEntity=""}_onAddEntityChange(e){this._pendingAddEntity=(e.detail?.value??"").trim()}_onFallbackAddEntityInput(e){this._pendingAddEntity=e.target.value.trim()}_onPresetSelect(e){this._pendingPreset=e}_onPresetKeydown(e){const t="ArrowRight"===e.key||"ArrowDown"===e.key,i="ArrowLeft"===e.key||"ArrowUp"===e.key;if(!t&&!i)return;e.preventDefault();const r=Qe.map(e=>e.id);if(0===r.length)return;const n=Math.max(0,r.indexOf(this._pendingPreset)),s=r[(n+(t?1:r.length-1))%r.length];this._onPresetSelect(s),this.updateComplete.then(()=>{this.renderRoot?.querySelector(`.preset-option[data-preset="${s}"]`)?.focus()})}_confirmAdd(){if(!this.canManage||this.managing)return;const e=this._pendingAddEntity.trim();e&&this.dispatchEvent(new CustomEvent("add-light",{detail:{entityId:e,preset:this._pendingPreset},bubbles:!0,composed:!0}))}_renderAddForm(){const e=[...this.groupEntityId?[this.groupEntityId]:[],...this.curves.map(e=>e.entityId)];return q`
      <div class="add-form">
        ${rt({ready:this._picker.ready,hass:this.hass,value:this._pendingAddEntity,includeDomains:["light"],excludeEntities:e,placeholder:"light.entity_id",onValueChanged:this._onAddEntityChange,onFallbackInput:this._onFallbackAddEntityInput})}
        <div class="preset-field">
          <label id="preset-grid-label">Start shape</label>
          <div
            class="preset-grid"
            role="radiogroup"
            aria-labelledby="preset-grid-label"
            @keydown=${this._onPresetKeydown}
          >
            ${Qe.map(e=>{const t=e.id===this._pendingPreset;return q`
                <button
                  type="button"
                  class="preset-option ${t?"active":""}"
                  data-preset=${e.id}
                  role="radio"
                  aria-checked=${t?"true":"false"}
                  tabindex=${t?"0":"-1"}
                  @click=${()=>this._onPresetSelect(e.id)}
                >
                  ${nt(e)}
                  <span class="preset-name">${e.name}</span>
                </button>
              `})}
          </div>
        </div>
        <div class="add-form-actions">
          <button type="button" ?disabled=${this.managing} @click=${this._cancelAdd}>Cancel</button>
          <button
            type="button"
            class="primary"
            ?disabled=${!this._pendingAddEntity||this.managing}
            @click=${this._confirmAdd}
          >
            Add
          </button>
        </div>
      </div>
    `}_renderConfirmRow(e){return q`
      <div class="confirm-row">
        <span class="confirm-text">Remove "${e.friendlyName}"?</span>
        <button type="button" class="confirm-btn" @click=${e=>this._cancelRemove(e)}>
          Cancel
        </button>
        <button
          type="button"
          class="confirm-btn danger"
          @click=${t=>this._confirmRemove(t,e.entityId)}
        >
          Remove
        </button>
      </div>
    `}render(){const e=function(e){if(e.length<2)return e.map(e=>({prefix:"",discriminator:e}));let t=e[0].length;for(let i=1;i<e.length;i++){const r=e[0],n=e[i];let s=0;for(;s<t&&s<n.length&&r.charCodeAt(s)===n.charCodeAt(s);)s++;if(t=s,0===t)break}const i=e[0];for(;t>0&&!gt.test(i[t-1]);)t--;let r=t;for(;r>0&&gt.test(i[r-1]);)r--;if(0===r)return e.map(e=>({prefix:"",discriminator:e}));const n=i.slice(0,r),s=e.map(e=>({prefix:n,discriminator:e.slice(t).replace(/^[\s\-–—/:]+/,"")}));return s.some(e=>0===e.discriminator.length)?e.map(e=>({prefix:"",discriminator:e})):s}(this.curves.map(e=>e.friendlyName)),t=this.curves.filter(e=>e.visible).length,i=this.curves.length-t,r=0===this.curves.length?Ye.emptyCount:0===i?Ye.countAllVisible(this.curves.length):Ye.countWithHidden(t,i),n=this.curves.length>=20;return q`
      <div
        class="legend-panel ${n?"large-group":""}"
        data-density=${n?"large":"normal"}
      >
        <div class="legend-header">
          <div class="legend-label">${Ye.title}</div>
          <div class="legend-count" title=${r}>${r}</div>
        </div>
        <div class="legend" role="list" aria-label=${Ye.listAria(this.curves.length)}>
          ${this.curves.map((t,i)=>{const r=this.canManage&&!this.managing&&this._confirmingRemove===t.entityId,n=e[i],s=this.selectedCurveId===t.entityId;return q`
              <div
                class="legend-item ${t.visible?"":"hidden"} ${s?"selected":""} ${r?"confirming":""} ${this.manageMode?"manage-mode":""}"
                role="listitem"
                style="--accent-color: ${t.color}"
              >
                ${r?this._renderConfirmRow(t):q`
                      <button
                        type="button"
                        class="row-select-btn"
                        aria-pressed=${s?"true":"false"}
                        @click=${()=>this._select(t.entityId)}
                        @keydown=${e=>this._onItemKeyDown(e,t.entityId)}
                      >
                        <span
                          class="color-dot shape-${ut._shapes[i%ut._shapes.length]}"
                          style="background: ${t.color}; --dot-color: ${t.color}"
                        ></span>
                        <span class="name-block">
                          <span class="name discriminator" title=${t.friendlyName}
                            >${n.discriminator}</span
                          >
                          ${n.prefix?q`<span class="prefix">${n.prefix}</span>`:W}
                          <span class="entity-id" title=${t.entityId}>${t.entityId}</span>
                        </span>
                        ${null!==this.scrubberPosition?q`<span class="brightness-value"
                              >${Math.round(Ne(t.controlPoints,Math.round(this.scrubberPosition)))}%</span
                            >`:W}
                      </button>
                      ${s?q`
                            <button
                              type="button"
                              class="clear-edit-icon"
                              aria-label="Clear selection for ${t.friendlyName}"
                              title="Clear selection for ${t.friendlyName}"
                              @click=${e=>this._clearSelection(e,t.entityId)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          `:W}
                      <button
                        type="button"
                        class="eye-btn"
                        aria-label="${t.visible?"Hide":"Show"} ${t.friendlyName}"
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
                      ${this.canManage&&this.manageMode&&this.curves.length>1?q`<button
                            type="button"
                            class="remove-icon"
                            aria-label="Remove ${t.friendlyName}"
                            title="Remove ${t.friendlyName}"
                            ?disabled=${this.managing}
                            @click=${e=>this._startRemove(e,t.entityId)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path
                                d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                              ></path>
                            </svg>
                          </button>`:W}
                    `}
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
                      ${this._addingLight?this._renderAddForm():q`<button
                            type="button"
                            class="add-light-btn"
                            ?disabled=${this.managing}
                            @click=${this._startAdd}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add a light
                          </button>`}
                      ${this.canManage?q`<button
                            type="button"
                            class="manage-toggle-btn ${this.manageMode?"active":""}"
                            aria-pressed=${this.manageMode?"true":"false"}
                            ?disabled=${this.managing||this._addingLight}
                            @click=${this._onManageToggleClick}
                          >
                            ${this.manageMode?Ye.removeDone:q`
                                  <svg
                                    class="toggle-icon"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    aria-hidden="true"
                                  >
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path
                                      d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                    ></path>
                                  </svg>
                                  ${Ye.removeToggle}
                                `}
                          </button>`:W}
                    </div>
                  `}
              ${this.canManage?q`
                    ${this.manageMode?q`
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
            `:W}
      </div>
    `}_onManageToggleClick(){this.dispatchEvent(new CustomEvent("manage-toggle",{detail:{manageMode:!this.manageMode},bubbles:!0,composed:!0}))}_startDeleteGroup(){this.canManage&&!this.managing&&(this._cancelAdd(),this._confirmingRemove=null,this._confirmingDeleteGroup=!0)}_cancelDeleteGroup(){this._confirmingDeleteGroup=!1}_confirmDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("delete-group",{bubbles:!0,composed:!0})))}}ut.styles=a`
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
    .legend-item.confirming {
      background: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
      cursor: default;
    }
    .legend-item.confirming:hover {
      background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
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
    .remove-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.7;
      transition:
        opacity 0.15s ease,
        color 0.15s ease;
      padding: 14px;
      box-sizing: content-box;
      color: var(--secondary-text-color, #616161);
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .remove-icon:hover {
      opacity: 1;
      color: var(--error-color, #db4437);
    }
    /* Selected row is the active editing target — hide the trash to keep the
       row readable on mobile and avoid mis-tapping while editing. Deselect
       first (click the X), then delete. */
    .legend-item.selected .remove-icon {
      display: none;
    }
    .remove-icon:focus {
      outline: none;
    }
    .remove-icon:focus-visible {
      outline: 2px solid var(--error-color, #db4437);
      outline-offset: 2px;
      border-radius: 4px;
      opacity: 1;
    }
    .remove-icon:disabled {
      cursor: not-allowed;
      opacity: 0.3 !important;
    }
    .remove-icon svg {
      width: 16px;
      height: 16px;
      display: block;
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
    .discriminator {
      font-weight: inherit;
    }
    .prefix {
      display: block;
      font-size: 10px;
      font-weight: 400;
      color: var(--secondary-text-color, #757575);
      opacity: 0.85;
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
    .legend-item:not(.selected):not(.manage-mode):not(:hover):not(:focus-within) .entity-id {
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
    .clear-edit-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      padding: 14px;
      box-sizing: content-box;
      color: var(--primary-color, #2563eb);
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition:
        opacity 0.15s ease,
        background 0.15s ease;
    }
    .clear-edit-icon:hover {
      opacity: 1;
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      border-radius: 4px;
    }
    .clear-edit-icon:focus {
      outline: none;
    }
    .clear-edit-icon:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
      border-radius: 4px;
      opacity: 1;
    }
    .clear-edit-icon svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .confirm-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }
    .confirm-text {
      flex: 1;
      min-width: 0;
      word-break: break-word;
      font-size: 12px;
      color: var(--error-color, #db4437);
      font-weight: 500;
    }
    .confirm-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--divider);
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      font-family: inherit;
      flex-shrink: 0;
    }
    .confirm-btn.danger {
      background: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
      color: #fff;
    }
    .confirm-btn.danger:hover {
      opacity: 0.9;
    }
    .confirm-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .add-divider {
      height: 1px;
      margin: 6px 10px;
      background: var(--divider);
    }
    .add-row {
      padding: 6px 10px 8px;
      display: flex;
      align-items: stretch;
      gap: 8px;
    }
    .manage-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: none;
      /* .add-row stretches its children to match the open add-form's
         height; pin this to its natural compact size instead of growing
         into a tall ghost column while adding a light. */
      align-self: flex-start;
      min-height: 32px;
      padding: 4px 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      /* Neutral at rest: the red treatment belongs to the per-light confirm,
         not to a mode toggle nothing has happened in yet. */
      color: var(--secondary-text-color, #616161);
      background: transparent;
      border: 1px solid var(--divider);
      border-radius: 8px;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
    }
    .manage-toggle-btn:hover:not(:disabled) {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
    }
    .manage-toggle-btn:focus-visible {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    .manage-toggle-btn.active {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
    }
    .manage-toggle-btn .toggle-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    .manage-toggle-btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
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
    .add-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .add-form input[type='text'] {
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
    .add-form input[type='text']:focus {
      outline: none;
      border-color: var(--primary-color, #2563eb);
      box-shadow: 0 0 0 1px var(--primary-color, #2563eb);
    }
    .preset-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .preset-field label {
      font-size: 11px;
      color: var(--secondary-text-color, #616161);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      min-width: 0;
    }
    .preset-option {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 6px 8px;
      border: 1px solid var(--divider);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
      min-width: 0;
      overflow: hidden;
    }
    .preset-option:hover {
      border-color: var(--primary-color, #2563eb);
    }
    .preset-option:focus-visible {
      outline: none;
      border-color: var(--primary-color, #2563eb);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #2563eb) 40%, transparent);
    }
    .preset-option.active {
      border-color: var(--primary-color, #2563eb);
      background: color-mix(in srgb, var(--primary-color, #2563eb) 12%, transparent);
    }
    .preset-option .preset-thumb {
      flex: 0 1 46px;
      width: clamp(34px, 38%, 46px);
      max-width: 46px;
      min-width: 0;
    }
    .preset-option .preset-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .add-form-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    .add-form-actions button {
      padding: 4px 12px;
      min-height: 44px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid var(--divider);
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      font-family: inherit;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
    }
    .add-form-actions button:hover:not(:disabled) {
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color, #2563eb);
    }
    .add-form-actions button.primary {
      background: var(--primary-color, #2563eb);
      border-color: var(--primary-color, #2563eb);
      color: #fff;
    }
    .add-form-actions button.primary:hover:not(:disabled) {
      opacity: 0.9;
      color: #fff;
    }
    .add-form-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
    @media ${ct} {
      .preset-grid {
        grid-template-columns: 1fr;
      }
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
      .remove-icon {
        opacity: 0.6;
        width: 44px;
        height: 44px;
        padding: 12px;
        box-sizing: border-box;
      }
      .remove-icon svg {
        width: 18px;
        height: 18px;
      }
      .clear-edit-icon {
        width: 44px;
        height: 44px;
        padding: 12px;
        box-sizing: border-box;
      }
      .clear-edit-icon svg {
        width: 18px;
        height: 18px;
      }
    }
  `,ut._shapes=Fe,e([ue({type:Array})],ut.prototype,"curves",void 0),e([ue({type:String})],ut.prototype,"selectedCurveId",void 0),e([ue({type:Number})],ut.prototype,"scrubberPosition",void 0),e([ue({type:Boolean})],ut.prototype,"canManage",void 0),e([ue({type:Boolean})],ut.prototype,"managing",void 0),e([ue({type:Boolean})],ut.prototype,"manageMode",void 0),e([ue({type:Number})],ut.prototype,"closeRemoveSignal",void 0),e([ue({type:Number})],ut.prototype,"closeAddSignal",void 0),e([ue({type:String})],ut.prototype,"groupEntityId",void 0),e([ue({attribute:!1})],ut.prototype,"hass",void 0),e([ve()],ut.prototype,"_confirmingRemove",void 0),e([ve()],ut.prototype,"_confirmingDeleteGroup",void 0),e([ve()],ut.prototype,"_addingLight",void 0),e([ve()],ut.prototype,"_pendingAddEntity",void 0),e([ve()],ut.prototype,"_pendingPreset",void 0),be("curve-legend",ut);class vt extends ce{constructor(){super(...arguments),this.dirty=!1,this.readOnly=!1,this.saving=!1,this.canUndo=!1,this.previewActive=!1}_onSave(){this.dispatchEvent(new CustomEvent("save-curves",{bubbles:!0,composed:!0}))}_onCancel(){this.dispatchEvent(new CustomEvent("cancel-curves",{bubbles:!0,composed:!0}))}_onUndo(){this.dispatchEvent(new CustomEvent("undo-curves",{bubbles:!0,composed:!0}))}render(){return this.readOnly?q`
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
          ${this.saving?We.saving:this.previewActive?We.savePreview:We.save}
        </button>
      </div>
    `:q``}}vt.styles=a`
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
    @media ${ct} {
      .footer {
        min-height: 48px;
      }
      button {
        padding: 12px 20px;
        font-size: 14px;
        min-height: 44px;
      }
    }
  `,e([ue({type:Boolean})],vt.prototype,"dirty",void 0),e([ue({type:Boolean})],vt.prototype,"readOnly",void 0),e([ue({type:Boolean})],vt.prototype,"saving",void 0),e([ue({type:Boolean})],vt.prototype,"canUndo",void 0),e([ue({type:Boolean})],vt.prototype,"previewActive",void 0),be("curve-footer",vt);"undefined"!=typeof window&&(function(){const e=globalThis.CSS;if(e?.registerProperty)try{e.registerProperty({name:"--curve-graph-max-height",syntax:"<length-percentage>",inherits:!0,initialValue:"320px"})}catch{}}(),window.__LIGHTENER_CURVE_CARD_VERSION__="2.16.0",function(e,t){if(void 0===e.customCards&&(e.customCards=[]),!Array.isArray(e.customCards))return;const i=e.customCards;i.some(e=>e?.type===t.type)||i.push(t)}(window,{type:me,name:"Lightener Studio",description:"Shape how each light responds to group brightness.",documentationURL:"https://github.com/florianhorner/lightener-studio#readme",preview:!0,getEntitySuggestion:function(e,t){return fe(e,t)?{config:{type:_e,entity:t}}:null}}));const mt=q`<svg
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
</svg>`;const _t=["light"];class ft extends ce{constructor(){super(...arguments),this._config={},this._hass=null,this._picker=new ye(()=>this.isConnected,()=>this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._picker.ensureLoaded()}setConfig(e){this._config=e,this._picker.ensureLoaded()}set hass(e){this._hass=e,this._picker.ensureLoaded()}_fireConfigChanged(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_onEntityChange(e){const t=e.detail?.value??"";this._config={...this._config,entity:t||void 0},this._fireConfigChanged()}_onTitleChange(e){const t=e.target.value;this._config={...this._config,title:t||void 0},this._fireConfigChanged()}_onFallbackEntityInput(e){const t=e.target.value.trim();this._config={...this._config,entity:t||void 0},this._fireConfigChanged()}render(){const e=this._config.entity??"",t=this._config.title??"",i=this._hass?function(e){const t=e.entities;return t?Object.keys(t).filter(t=>fe(e,t)):[]}(this._hass):[];return q`
      <div class="form">
        <div class="field">
          <label>Entity</label>
          ${rt({ready:this._picker.ready,hass:this._hass,value:e,includeDomains:_t,includeEntities:i.length?i:void 0,placeholder:"light.your_lightener_group",fallbackEvent:"change",onValueChanged:this._onEntityChange,onFallbackInput:this._onFallbackEntityInput})}
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
            .value=${t}
            placeholder="Brightness shapes"
            @input=${this._onTitleChange}
          />
        </div>
      </div>
    `}}ft.styles=a`
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
  `,e([ve()],ft.prototype,"_config",void 0),e([ve()],ft.prototype,"_hass",void 0),be("lightener-curve-card-editor",ft);class bt extends ce{constructor(){super(...arguments),this._curves=[],this._originalCurves=[],this._config={},this._selectedCurveId=null,this._saveState=st,this._load=at,this._manageError=null,this._managingLights=!1,this._groupDeleted=!1,this._scrubberPosition=null,this._cancelAnimating=!1,this._hass=null,this._undoStack=[],this._dragUndoPushed=!1,this._dragActive=!1,this._boundKeyHandler=null,this._boundBeforeUnload=null,this._saveGuard=new ot({dispatchSave:e=>this._dispatchSave(e),getSavePhase:()=>this._saveState.phase}),this._cancelAnimFrame=null,this._previewActive=!1,this._presetGraphTrial=null,this._legendCloseRemoveSignal=0,this._legendCloseAddSignal=0,this._manageMode=!1,this._lastPresetPointerType=null,this._previewController=new Ve({getHass:()=>this._hass,getCurves:()=>this._curves,getScrubberPosition:()=>this._scrubberPosition,setScrubberPosition:e=>{this._scrubberPosition=e},getStorageEntityId:()=>this._storageEntityId,persistScrubberPosition:(e,t)=>{this._writeStoredState(e,{scrubberPosition:t})},setPreviewActive:e=>{this._previewActive=e}}),this._lastEmittedDirtyState=!1,this._dirtyVersion=0,this._cleanVersion=0,this._onPreviewToggle=()=>{this._clearPresetGraphTrial(),this._previewActive?this._stopPreview():this._startPreview()},this._startPreview=()=>{this._previewController.start()},this._stopPreview=()=>{this._previewController.stop()}}get _saving(){return"saving"===(e=this._saveState).phase||"confirming"===e.phase;var e}get _saveSuccess(){return"saved"===this._saveState.phase}get _saveError(){return"error"===(e=this._saveState).phase?e.message:null;var e}_dispatchSave(e){const t="confirming"===this._saveState.phase;this._saveState=function(e,t){switch(t.type){case"reset":return{phase:"idle"};case"dirty":return"idle"===e.phase?{phase:"dirty"}:e;case"save-start":return"saving"===e.phase||"confirming"===e.phase?e:{phase:"saving"};case"save-success":return"saving"!==e.phase?e:{phase:"confirming"};case"save-confirmed":return"confirming"!==e.phase?e:{phase:"saved"};case"save-error":return"saving"!==e.phase&&"confirming"!==e.phase?e:{phase:"error",message:t.message};case"save-clear":return"saved"===e.phase||"error"===e.phase?{phase:"idle"}:e}}(this._saveState,e),"confirming"!==this._saveState.phase&&this._saveGuard.onLeaveConfirming(this._saveState.phase,t)}get _lastPreviewTime(){return this._previewController.lastPreviewTime}set _lastPreviewTime(e){this._previewController.lastPreviewTime=e}get _embedded(){return!0===this._config.embedded}static getConfigElement(){return document.createElement("lightener-curve-card-editor")}static getStubConfig(){return{type:_e}}setConfig(e){const t=e.entity!==this._config.entity;this._config=e,t&&(this._previewActive&&this._stopPreview(),this._dragActive=!1,this._load=function(e){return{...e,loaded:!1,loadedEntityId:void 0,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._groupDeleted=!1,this._clearPresetGraphTrial(),this._selectedCurveId=null,this._scrubberPosition=null,this._undoStack=[],this._cleanVersion=this._dirtyVersion,this._tryLoadCurves())}set hass(e){const t=!!this._hass;this._hass=e,t&&this._load.loaded||this._dragActive||this._tryLoadCurves()}getCardSize(){return 4}getGridOptions(){return{columns:12,rows:9,min_columns:6,min_rows:6}}get _isAdmin(){return this._hass?.user?.is_admin??!1}get _entityId(){return this._config.entity}get _storageEntityId(){return this._load.loadedEntityId??this._entityId}get _isDirty(){return this._dirtyVersion!==this._cleanVersion}get _selectedCurve(){if(null!==this._selectedCurveId)return this._curves.find(e=>e.entityId===this._selectedCurveId)}get _canShowPresetGraphTrial(){return!(void 0===this._selectedCurve||this._saving||this._cancelAnimating||this._managingLights||this._previewActive)}get _isShowingPresetGraphTrial(){return null!==this._presetGraphTrial&&this._canShowPresetGraphTrial}get _graphCurves(){return this._curves}get _effectiveScrubberPosition(){return this._scrubberPosition??50}get _presetPreviewCurve(){if(!this._isShowingPresetGraphTrial||!this._presetGraphTrial)return null;const e=this._selectedCurve;return e?{...e,controlPoints:this._presetGraphTrial.controlPoints,visible:!0}:null}get _canManageLights(){return this._isAdmin&&!!this._hass&&!!this._entityId&&!this._isDirty&&!this._saving&&!this._cancelAnimating&&!this._load.loading&&!this._managingLights&&!this._load.loadError&&!this._groupDeleted}get dirty(){return this._isDirty}connectedCallback(){super.connectedCallback(),this._load.loadErrorEntityId!==this._entityId&&(this._load=dt(this._load)),this._groupDeleted&&this._load.loadedEntityId!==this._entityId&&(this._groupDeleted=!1,this._load=dt(this._load)),this._tryLoadCurves(),this._boundKeyHandler=this._onKeyDown.bind(this),this._boundBeforeUnload=this._onBeforeUnload.bind(this),window.addEventListener("keydown",this._boundKeyHandler),window.addEventListener("beforeunload",this._boundBeforeUnload)}disconnectedCallback(){super.disconnectedCallback(),this._previewActive&&this._stopPreview(),this._clearPresetGraphTrial(),this._previewController.disconnect(),this._dragActive=!1,this._boundKeyHandler&&window.removeEventListener("keydown",this._boundKeyHandler),this._boundBeforeUnload&&window.removeEventListener("beforeunload",this._boundBeforeUnload),"confirming"===this._saveState.phase&&(this._saveGuard.settleError(),this._load={...this._load,loading:!1,loaded:!1,reloadAfterLoadEntityId:void 0},this._dispatchSave({type:"reset"})),this._saveGuard.dispose(),this._cancelAnimFrame&&(cancelAnimationFrame(this._cancelAnimFrame),this._cancelAnimFrame=null,this._cancelAnimating=!1)}updated(e){if(super.updated(e),e.has("_curves")||e.has("_originalCurves")||e.has("_cancelAnimating")){const e=this._isDirty;e!==this._lastEmittedDirtyState&&(this._lastEmittedDirtyState=e,this.dispatchEvent(new CustomEvent("curve-dirty-state",{detail:{dirty:e},bubbles:!0,composed:!0})),e&&this._dispatchSave({type:"dirty"}))}}_setPresetGraphTrial(e){this._presetGraphTrial?.id!==e?.id&&(this._presetGraphTrial=e,this.dispatchEvent(new CustomEvent("preset-trial-change",{detail:{presetId:e?.id??null},bubbles:!0,composed:!0})))}_clearPresetGraphTrial(){this._setPresetGraphTrial(null),this._lastPresetPointerType=null}_rememberPresetPointer(e){this._lastPresetPointerType=e.pointerType}_startPresetGraphTrial(e,t){"touch"!==(t&&"pointerType"in t?String(t.pointerType):this._lastPresetPointerType)&&this._canShowPresetGraphTrial&&this._setPresetGraphTrial(e)}_endPresetGraphTrial(e){this._presetGraphTrial?.id===e.id&&this._clearPresetGraphTrial(),this._lastPresetPointerType=null}_onLegendRemovePanelOpen(){this._clearPresetGraphTrial()}_applyPreset(e){if(this._cancelAnimating||this._saving||this._managingLights)return;const t=this._selectedCurve;if(!t)return void this._clearPresetGraphTrial();const i=t.entityId,r=function(e,t,i){const r=()=>i.map(e=>({...e}));return null!==t?e.map(e=>e.entityId===t?{...e,controlPoints:r()}:e):e.map(e=>({...e,controlPoints:r()}))}(this._curves,i,e.controlPoints);this._clearPresetGraphTrial(),$e(r,this._curves)||this._commitCurveEdit(r)}_renderPresetsPanel(){const e=this._selectedCurve;return e?q`
      <div class="presets-panel" role="region" aria-label=${Xe.panelAria}>
        <div class="presets-header">${Xe.forLight(e.friendlyName)}</div>
        <div class="presets-explanation">${Xe.explanation}</div>
        ${Qe.map(e=>q`
            <button
              class="preset-option ${this._presetGraphTrial?.id===e.id?"trial":""}"
              aria-current=${this._presetGraphTrial?.id===e.id?"true":W}
              @pointerdown=${this._rememberPresetPointer}
              @pointerenter=${t=>this._startPresetGraphTrial(e,t)}
              @pointerleave=${()=>this._endPresetGraphTrial(e)}
              @pointercancel=${()=>this._endPresetGraphTrial(e)}
              @focus=${()=>this._startPresetGraphTrial(e)}
              @blur=${()=>this._endPresetGraphTrial(e)}
              @click=${()=>this._applyPreset(e)}
            >
              ${nt(e)}
              <div class="preset-name">${e.name}</div>
              <div class="preset-desc">${e.description}</div>
            </button>
          `)}
      </div>
    `:q`
        <div class="presets-panel empty" role="region" aria-label=${Xe.panelAria}>
          <div class="presets-header">${Xe.title}</div>
          <div class="presets-empty-title">${Xe.emptyTitle}</div>
          <div class="presets-empty-copy">${Xe.emptyBody}</div>
        </div>
      `}_storedStateKey(e){return`lightener:curve-card:v1:${e}`}_readStoredState(e){try{const t=sessionStorage.getItem(this._storedStateKey(e));if(!t)return null;const i=JSON.parse(t),r="string"==typeof i.selectedCurveId||null===i.selectedCurveId?i.selectedCurveId:null;let n=null;return"number"==typeof i.scrubberPosition&&isFinite(i.scrubberPosition)&&(n=Math.min(100,Math.max(0,i.scrubberPosition))),{selectedCurveId:r,scrubberPosition:n}}catch{return null}}_writeStoredState(e,t){try{const i={...this._readStoredState(e)??{selectedCurveId:null,scrubberPosition:null},...t};sessionStorage.setItem(this._storedStateKey(e),JSON.stringify(i))}catch{}}_onKeyDown(e){var t,i;(t=document.activeElement,i=this,!t||t===i||t===document.body||i.contains(t))&&((e.ctrlKey||e.metaKey)&&"s"===e.key&&this._isDirty&&this._isAdmin&&!this._saving&&!this._managingLights&&(e.preventDefault(),this._onSave()),!e.ctrlKey&&!e.metaKey||"z"!==e.key||e.shiftKey||!this._saving&&!this._cancelAnimating&&!this._managingLights&&this._undoStack.length>0&&(e.preventDefault(),this._undo()),"Escape"===e.key&&(this._presetGraphTrial?(e.preventDefault(),this._clearPresetGraphTrial()):!this._isDirty||this._saving||this._cancelAnimating||this._managingLights||(e.preventDefault(),this._onCancel())))}_onBeforeUnload(e){this._isDirty&&(e.preventDefault(),e.returnValue="")}async _tryLoadCurves(){const e=this._saveGuard.currentGeneration();if(!function(e,t){return!(e.loaded&&e.loadedEntityId===t||e.loading)}(this._load,this._entityId))return;if(!this._hass||!this._entityId){if(0===this._curves.length){const e=[{entityId:"light.ceiling_light",friendlyName:"Ceiling Light",controlPoints:[{lightener:0,target:0},{lightener:20,target:0},{lightener:60,target:80},{lightener:100,target:100}],visible:!0,color:Be[0]},{entityId:"light.sofa_lamp",friendlyName:"Sofa Lamp",controlPoints:[{lightener:0,target:0},{lightener:10,target:50},{lightener:40,target:100},{lightener:70,target:100},{lightener:100,target:60}],visible:!0,color:Be[1]},{entityId:"light.led_strip",friendlyName:"LED Strip",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}],visible:!0,color:Be[2]}];this._curves=e,this._originalCurves=we(e),this._cleanVersion=this._dirtyVersion}return}this._load=function(e){return{...e,loadError:null,loading:!0}}(this._load);const t=this._entityId;try{const s=await this._hass.callWS({type:"lightener/get_curves",entity_id:t}),{state:o,action:a}=function(e,t,i,r){return i!==t?{state:e,action:"discard"}:e.reloadAfterLoadEntityId===t?{state:e,action:"run-queued-reload"}:r?{state:{...e,pendingReloadEntityId:t,loaded:!0,loadedEntityId:t,loadErrorEntityId:void 0},action:"defer-dirty"}:{state:{...e,pendingReloadEntityId:void 0,loaded:!0,loadedEntityId:t,loadErrorEntityId:void 0},action:"apply"}}(this._load,t,this._entityId,this._isDirty);let l;if("apply"!==a&&"defer-dirty"!==a||(i=s.entities,r=this._hass.states,n=Be,l=Object.keys(i).map((e,t)=>{const s=i[e]?.brightness??{},o=new Map([[0,0]]);for(const[e,t]of Object.entries(s)){const i=Number(e),r=Number(t);Number.isFinite(i)&&Number.isFinite(r)&&(i<0||i>100||r<0||r>100||o.set(i,r))}const a=[...o].map(([e,t])=>({lightener:e,target:t}));a.sort((e,t)=>e.lightener-t.lightener);const l=r[e]?.attributes?.friendly_name??e.replace("light.","");return{entityId:e,friendlyName:l,controlPoints:a,visible:!0,color:n[t%n.length]}})),this._load=o,("apply"===a||"defer-dirty"===a)&&"apply"===a&&l){if(this._curves=l,this._originalCurves=we(l),this._cleanVersion=this._dirtyVersion,null===this._selectedCurveId&&null===this._scrubberPosition){const e=this._readStoredState(t);e&&(null!==e.selectedCurveId&&ke(this._curves,e.selectedCurveId)&&(this._selectedCurveId=e.selectedCurveId),null!==e.scrubberPosition&&(this._scrubberPosition=e.scrubberPosition))}this._saveGuard.confirm(e)}}catch(i){const{state:r,discarded:n}=function(e,t,i,r){return i!==t?{state:e,discarded:!0}:{state:{...e,loadError:r,loaded:!0,loadedEntityId:t,loadErrorEntityId:t},discarded:!1}}(this._load,t,this._entityId,String(i));this._load=r,n||(console.error("[Lightener] Failed to load curves:",i),this._saveGuard.fail(e,"Save failed. Check connection."))}finally{const{state:e,followUp:i}=function(e,t,i){const r={...e,loading:!1};return i!==t?{state:r,followUp:"reload-changed-entity"}:e.reloadAfterLoadEntityId===t?{state:{...r,reloadAfterLoadEntityId:void 0,loaded:!1},followUp:"run-queued-reload"}:{state:r,followUp:"none"}}(this._load,t,this._entityId);this._load=e,"none"!==i&&this._tryLoadCurves()}var i,r,n}_onScrubberMove(e){this._clearPresetGraphTrial();const t=e.detail.position;this._scrubberPosition=t,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{scrubberPosition:t}),this._previewActive&&this._previewLights(t)}_onScrubberStart(){}_onScrubberEnd(){}_refreshActivePreview(e=!1){this._previewController.refresh(e)}_previewLights(e,t=!1){this._previewController.previewLights(e,t)}_previewSingleLight(e,t,i=!1,r){this._previewController.previewSingleLight(e,t,i,r)}_onSelectCurve(e){if(this._cancelAnimating)return;const{entityId:t}=e.detail;(t===this._selectedCurveId||ke(this._curves,t))&&(this._clearPresetGraphTrial(),this._selectedCurveId=function(e,t){return e===t?null:t}(this._selectedCurveId,t),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}),this._refreshActivePreview(!0))}_onFocusCurve(e){if(this._cancelAnimating)return;const{entityId:t}=e.detail;ke(this._curves,t)&&(this._clearPresetGraphTrial(),this._selectedCurveId=t,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}),this._refreshActivePreview(!0))}_pushUndo(){Pe(this._undoStack,this._curves)}_commitCurveEdit(e){this._pushUndo(),this._curves=e,this._dirtyVersion++,this._refreshActivePreview(!0)}_completeDragMaybeReload(){this._dragUndoPushed=!1,this._dragActive=!1,!this._load.loaded&&this._hass&&this._tryLoadCurves()}_undo(){0!==this._undoStack.length&&null===this._cancelAnimFrame&&(this._clearPresetGraphTrial(),this._animateCurvesTo(this._undoStack.pop(),()=>{this._refreshActivePreview(!0)}))}_animateCurvesTo(e,t){const i=we(this._curves);this._cancelAnimating=!0;const r=performance.now(),n=s=>{const o=s-r,a=Math.min(o/300,1),l=function(e){return 1-Math.pow(1-e,3)}(a),d=e.map((e,t)=>{const r=i[t];if(!r)return e;const n=r.controlPoints,s=e.controlPoints,o=function(e,t,i){const r=Math.min(e.length,t.length),n=[];for(let s=0;s<r;s++)n.push({lightener:Math.round(e[s].lightener+(t[s].lightener-e[s].lightener)*i),target:Math.round(e[s].target+(t[s].target-e[s].target)*i)});return n}(n,s,l);if(s.length>o.length&&a>=1)for(let e=o.length;e<s.length;e++)o.push({...s[e]});if(n.length>o.length&&a<1)for(let e=o.length;e<n.length;e++)o.push({...n[e]});return o.sort((e,t)=>e.lightener-t.lightener),{...e,controlPoints:o,visible:r.visible}});if(this._curves=d,a<1)this._cancelAnimFrame=requestAnimationFrame(n);else{this._curves=function(e,t){return t.map((t,i)=>({...t,visible:e[i]?.visible??t.visible}))}(i,e),this._cancelAnimating=!1,this._cancelAnimFrame=null;const r=$e(this._curves,this._originalCurves);r&&(this._cleanVersion=this._dirtyVersion),t?.(),r&&this._reloadPendingDirtyResponse()}};this._cancelAnimFrame=requestAnimationFrame(n)}_onPointMove(e){if(this._cancelAnimating)return;this._clearPresetGraphTrial();const{curveIndex:t,pointIndex:i,lightener:r,target:n}=e.detail,s=function(e,t,i,r,n){const s=[...e],o=s[t];if(!o||!o.controlPoints[i])return null;const a={...o},l=[...a.controlPoints];return l[i]={lightener:r,target:n},a.controlPoints=l,s[t]=a,s}(this._curves,t,i,r,n);if(null===s)return;this._dragActive=!0,this._dragUndoPushed||(this._pushUndo(),this._dragUndoPushed=!0);const o=this._curves[t];o&&this._selectedCurveId!==o.entityId&&(this._selectedCurveId=o.entityId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId})),this._curves=s,this._dirtyVersion++,o?this._previewSingleLight(o.entityId,r,!1,n):this._refreshActivePreview()}_onPointDrop(e){this._completeDragMaybeReload()}_onPointAdd(e){if(this._cancelAnimating)return;this._clearPresetGraphTrial();const{lightener:t,target:i,entityId:r}=e.detail,n=r??this._selectedCurveId;if(!n)return;const s=function(e,t,i,r){return function(e,t,i,r){const n=e.findIndex(e=>e.entityId===t);if(n<0)return null;if(e[n].controlPoints.some(e=>e.lightener===i))return null;const s=[...e],o={...s[n]};return o.controlPoints=[...o.controlPoints,{lightener:i,target:r}].sort((e,t)=>e.lightener-t.lightener),s[n]=o,s}(e,t,i,r)}(this._curves,n,t,i);null!==s&&this._commitCurveEdit(s)}_onPointRemove(e){if(this._cancelAnimating)return;this._clearPresetGraphTrial(),this._completeDragMaybeReload();const{curveIndex:t,pointIndex:i}=e.detail,r=Ce(this._curves,t,i);null!==r&&this._commitCurveEdit(r)}_onToggleCurve(e){if(this._cancelAnimating)return;this._clearPresetGraphTrial();const{entityId:t}=e.detail,i=this._selectedCurveId,r=function(e,t,i){const r=function(e,t){return e.map(e=>e.entityId===t?{...e,visible:!e.visible}:e)}(e,i);let n=t;if(t===i){const e=r.find(e=>e.entityId===i);e&&!e.visible&&(n=null)}return{curves:r,selectedCurveId:n}}(this._curves,this._selectedCurveId,t);this._curves=r.curves,r.selectedCurveId!==i&&(this._selectedCurveId=r.selectedCurveId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onManageToggle(e){this._clearPresetGraphTrial();const t=e.detail,i=t&&"boolean"==typeof t.manageMode?t.manageMode:!this._manageMode;this._manageMode=i,i||this._legendCloseRemoveSignal++}async _onDeleteGroup(){if(!this._hass||!this._entityId||this._managingLights)return;this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview();const e=this._entityId;this._manageError=null,this._managingLights=!0;try{const t=await this._hass.callWS({type:"config/entity_registry/get",entity_id:e});if("lightener"!==t?.platform)throw new Error("Entity is not a Lightener group — cannot delete from this card.");const i=t?.config_entry_id;if(!i)throw new Error("Group is not backed by a config entry — cannot delete from the card.");await this._hass.callApi("DELETE",`config/config_entries/entry/${i}`),this._manageMode=!1,this._legendCloseRemoveSignal++,this._curves=[],this._originalCurves=[],this._undoStack=[],this._load={...this._load,loaded:!0,loadedEntityId:e,loadError:null,loadErrorEntityId:void 0},this._selectedCurveId=null,this._writeStoredState(e,{selectedCurveId:null}),this._groupDeleted=!0,this.dispatchEvent(new CustomEvent("lightener-group-deleted",{detail:{entityId:e,configEntryId:i},bubbles:!0,composed:!0}))}catch(e){console.error("[Lightener] Failed to delete group:",e),this._manageError=this._formatManageError(e,"Could not delete group.")}finally{this._managingLights=!1}}async _onRemoveLight(e){if(!this._hass||!this._entityId||this._managingLights)return;this._clearPresetGraphTrial();const{entityId:t}=e.detail;if(t){this._previewActive&&this._stopPreview(),this._manageError=null,this._managingLights=!0;try{await this._hass.callWS({type:"lightener/remove_light",entity_id:this._entityId,controlled_entity_id:t}),this._selectedCurveId===t&&(this._selectedCurveId=null,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:null})),this._undoStack=[],this._load=dt(this._load),await this._tryLoadCurves()}catch(e){console.error("[Lightener] Failed to remove light:",e),this._manageError=this._formatManageError(e,"Could not remove light.")}finally{this._managingLights=!1}}}async _onAddLight(e){if(!this._hass||!this._entityId||this._managingLights)return;this._clearPresetGraphTrial();const{entityId:t,preset:i}=e.detail;if(t){this._previewActive&&this._stopPreview(),this._manageError=null,this._managingLights=!0;try{const e={type:"lightener/add_light",entity_id:this._entityId,controlled_entity_id:t};i&&(e.preset=i),await this._hass.callWS(e),this._undoStack=[],this._load=dt(this._load),await this._tryLoadCurves(),this._legendCloseAddSignal++}catch(e){console.error("[Lightener] Failed to add light:",e),this._manageError=this._formatManageError(e,"Could not add light.")}finally{this._managingLights=!1}}}_onLegendAddPanelOpen(){this._clearPresetGraphTrial()}_formatManageError(e,t){const i=e;return i?.message?i.message:t}async saveCurves(){return this._onSave()}async _onSave(){if(!this._hass||!this._entityId||this._saving||this._cancelAnimating||this._managingLights)return!1;this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview();const e=this._entityId;this._dispatchSave({type:"save-start"});try{const t=function(e){const t={};for(const i of e){const e={};let r=-1,n=0;for(const t of i.controlPoints)Number.isFinite(t.lightener)&&Number.isFinite(t.target)&&(t.lightener<0||t.lightener>100||t.target<0||t.target>100||0===t.lightener&&0===t.target||(e[String(t.lightener)]=String(t.target),t.lightener>r&&(r=t.lightener,n=t.target)));!("100"in e)&&r>=0&&(e[100]=String(n)),t[i.entityId]={brightness:e}}return t}(this._curves);if(await this._hass.callWS({type:"lightener/save_curves",entity_id:e,curves:t}),this._entityId!==e)return this._previewActive&&this._stopPreview(),this._undoStack=[],this._dispatchSave({type:"reset"}),!1;this._cleanVersion=this._dirtyVersion,this._undoStack=[],this._load={...this._load,pendingReloadEntityId:void 0},this._dispatchSave({type:"save-success"});const{settled:i}=this._saveGuard.arm(),{state:r,runNow:n}=lt(this._load,e);return this._load=r,n&&this._tryLoadCurves(),"confirmed"===await i}catch(e){return console.error("[Lightener] Failed to save curves:",e),this._dispatchSave({type:"save-error",message:"Save failed. Check connection."}),!1}}_retryLoad(){this._load=function(e){return{...e,loaded:!1,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._tryLoadCurves()}_reloadCurvesAfterCurrentLoad(e){const{state:t,runNow:i}=lt(this._load,e);this._load=t,i&&this._tryLoadCurves()}_reloadPendingDirtyResponse(){const{state:e,reloadEntityId:t}=function(e,t){const i=e.pendingReloadEntityId;return i&&i===t?{state:{...e,pendingReloadEntityId:void 0},reloadEntityId:i}:{state:e}}(this._load,this._entityId);this._load=e,t&&this._reloadCurvesAfterCurrentLoad(t)}_onCancel(){this._cancelAnimating||(this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview(),this._undoStack=[],this._animateCurvesTo(we(this._originalCurves),()=>{this._selectedCurveId=null,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:null}),this._dispatchSave({type:"reset"})}))}_renderLoadingSkeleton(){return q`
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-graph" aria-hidden="true">
          <span class="loading-curve primary"></span>
          <span class="loading-curve warm"></span>
          <span class="loading-curve cool"></span>
          <span class="loading-point one"></span>
          <span class="loading-point two"></span>
          <span class="loading-point three"></span>
        </div>
        <div class="loading-caption">${Ze.loading}</div>
      </div>
    `}_renderGraphInsight(){if(this._isShowingPresetGraphTrial&&this._presetGraphTrial){const e=this._selectedCurve;return e?q`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${Xe.trying(this._presetGraphTrial.name)}
            >${Xe.trying(this._presetGraphTrial.name)}</span
          >
          <span
            class="graph-insight-secondary"
            title=${Xe.chooseForLight(e.friendlyName)}
            >${Xe.chooseForLight(e.friendlyName)}</span
          >
        </div>
      `:W}const e=it(this._curves,this._selectedCurveId);return e?q`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${e.primary}>${e.primary}</span>
        <span class="graph-insight-secondary" title=${e.secondary}>${e.secondary}</span>
      </div>
    `:W}render(){const e=this._graphCurves,t=!this._isAdmin||this._managingLights||this._isDirty||this._saving||this._cancelAnimating||this._undoStack.length>0;return q`
      <div
        class="card ${this._embedded?"embedded":""}"
        role="region"
        aria-label="Brightness editor"
      >
        <div class="header">
          <h2>${this._config.title??"Brightness shapes"}</h2>
        </div>

        <div class="workspace">
          <div class="main-stack">
            ${this._load.loading?this._renderLoadingSkeleton():q`<div class="graph-panel">
                  ${this._renderGraphInsight()}
                  <curve-graph
                    .curves=${e}
                    .selectedCurveId=${this._selectedCurveId}
                    .entityId=${this._entityId??null}
                    .readOnly=${!this._isAdmin||this._cancelAnimating||this._managingLights}
                    .scrubberPosition=${this._effectiveScrubberPosition}
                    .previewCurve=${this._presetPreviewCurve}
                    @point-move=${this._onPointMove}
                    @point-drop=${this._onPointDrop}
                    @point-add=${this._onPointAdd}
                    @point-remove=${this._onPointRemove}
                    @focus-curve=${this._onFocusCurve}
                  ></curve-graph>
                </div>`}
            ${this._curves.length>0?q`<curve-scrubber
                  .curves=${this._curves}
                  .readOnly=${!this._isAdmin||this._managingLights}
                  .canPreview=${this._isAdmin&&!this._cancelAnimating&&!this._managingLights}
                  .previewActive=${this._previewActive}
                  .dirty=${this._isDirty}
                  .position=${this._effectiveScrubberPosition}
                  @scrubber-move=${this._onScrubberMove}
                  @scrubber-start=${this._onScrubberStart}
                  @scrubber-end=${this._onScrubberEnd}
                  @preview-toggle=${this._onPreviewToggle}
                ></curve-scrubber>`:W}
          </div>

          <aside class="side-rail" aria-label=${Ze.railAria}>
            ${!this._load.loading&&this._isAdmin&&this._curves.length>0?this._renderPresetsPanel():W}
            <curve-legend
              .curves=${this._curves}
              .selectedCurveId=${this._selectedCurveId}
              .scrubberPosition=${this._effectiveScrubberPosition}
              .canManage=${this._canManageLights}
              .managing=${this._managingLights}
              .manageMode=${this._manageMode}
              .closeRemoveSignal=${this._legendCloseRemoveSignal}
              .closeAddSignal=${this._legendCloseAddSignal}
              .groupEntityId=${this._entityId}
              .hass=${this._hass}
              @select-curve=${this._onSelectCurve}
              @toggle-curve=${this._onToggleCurve}
              @remove-panel-open=${this._onLegendRemovePanelOpen}
              @add-panel-open=${this._onLegendAddPanelOpen}
              @remove-light=${this._onRemoveLight}
              @add-light=${this._onAddLight}
              @manage-toggle=${this._onManageToggle}
              @delete-group=${this._onDeleteGroup}
            ></curve-legend>
            ${this._manageError?q`<div class="error" role="alert">${mt} ${this._manageError}</div>`:W}
          </aside>

          <div class="footer-slot ${t?"active":""}">
            <curve-footer
              .dirty=${this._isDirty||this._cancelAnimating}
              .readOnly=${!this._isAdmin||this._managingLights}
              .saving=${this._saving||this._cancelAnimating||this._managingLights}
              .canUndo=${this._undoStack.length>0&&!this._cancelAnimating&&!this._managingLights}
              .previewActive=${this._previewActive}
              @save-curves=${this._onSave}
              @cancel-curves=${this._onCancel}
              @undo-curves=${()=>this._undo()}
            ></curve-footer>
          </div>
        </div>

        <div class="status-stack">
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
                ${mt} Failed to load curves
                <button type="button" class="retry-link" @click=${this._retryLoad}>Retry</button>
              </div>`:W}
          ${this._groupDeleted?q`<div class="error" role="status">
                ${mt} This Lightener group was deleted. Remove this card or point it at a
                different group.
              </div>`:W}
          ${this._saveError?q`<div class="error" role="alert">
                ${mt} Save failed
                <button type="button" class="retry-link" @click=${this._onSave}>Retry</button>
              </div>`:W}
        </div>
      </div>
    `}}bt.styles=a`
    @property --curve-graph-max-height {
      syntax: '<length-percentage>';
      inherits: true;
      initial-value: 320px;
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
      /* Register --curve-graph-max-height above so valid theme overrides size
         the graph and scrubber together, while invalid values fall back to the
         320px initial value instead of removing this max-width guard. */
      --curve-stack-max-width: calc(var(--curve-graph-max-height, 320px) * ${De/248} + 28px);

      display: block;
      font-family: var(
        --mdc-typography-body1-font-family,
        var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)
      );
      height: fit-content;
    }
    .card {
      /* Layout keys on the card's own width, not the viewport, so the
         Lovelace card and the sidebar panel behave identically at the same
         size (the viewport-keyed embedded-only rules made them diverge). */
      container-type: inline-size;
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
      min-width: 0;
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
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-radius: 12px;
      padding: 14px;
      background: var(--panel-bg);
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .graph-insight {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      color: var(--text-color);
      /* Reserve the band's height so summary/trial text swaps never move the
         graph below it (DESIGN.md: opening a shape must not push the graph). */
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
    /* The trial state must keep the resting state's one-line budget; letting
       it wrap grows the band and shoves the graph down on every hover. */
    .card.embedded .header {
      margin-bottom: 12px;
      padding-inline: 2px;
    }
    .card.embedded .graph-panel {
      padding: 14px;
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
    /* Wide card: two columns with a full-width editor action bar. Narrow card:
       stacked flow with the same sticky action bar so save/undo/cancel never
       sink below a long light list. Both are container queries on the card's
       own width — the Lovelace card and the sidebar panel get the same layout
       at the same size. Browsers without container-query support fall back to
       the stacked flow without stickiness. */
    @container (min-width: 860px) {
      .workspace {
        grid-template-columns:
          minmax(0, min(52%, var(--curve-stack-max-width)))
          minmax(320px, 1fr);
        align-items: start;
        /* Footer spans both columns because save/cancel apply to the whole
           editor state. Undo remains left in the bar; cancel/save stay grouped
           on the right like HA dialog/editor actions. */
        grid-template-areas:
          'main side'
          'footer footer';
      }
      .main-stack {
        grid-area: main;
      }
      .side-rail {
        grid-area: side;
      }
      .footer-slot {
        grid-area: footer;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
      }
    }
    /* Browsers without container queries (older wall-tablet WebViews) never
       match the blocks above, which would revive the footer-below-the-list
       regression. Keep the reachability guarantee for them: stacked flow
       with the sticky footer under the graph at every width. The solid
       background line covers engines that also lack color-mix. */
    @supports not (container-type: inline-size) {
      .footer-slot {
        order: 2;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
      }
      .side-rail {
        order: 3;
      }
    }
    @container (max-width: 859.98px) {
      .footer-slot {
        order: 2;
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
    .presets-panel {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      border: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      border-radius: 12px;
      padding: 10px;
      padding-bottom: 8px;
      animation: fade-in 0.15s ease;
    }
    .presets-panel.empty {
      display: block;
      padding: 10px 12px 12px;
    }
    .presets-header {
      grid-column: 1 / -1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-color);
    }
    .presets-explanation,
    .presets-empty-copy {
      grid-column: 1 / -1;
      font-size: 11px;
      line-height: 1.4;
      color: var(--secondary-text);
      opacity: 0.8;
    }
    .presets-empty-title {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 650;
      color: var(--text-color);
    }
    .presets-empty-copy {
      margin-top: 4px;
    }
    .preset-option {
      border: 1px solid var(--divider);
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      background: transparent;
      text-align: left;
      font-family: inherit;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      overflow: hidden;
    }
    .preset-option:hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .preset-option.trial {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
    }
    .preset-option:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .preset-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-color);
    }
    .preset-desc {
      min-width: 0;
      font-size: 10px;
      color: var(--secondary-text);
      opacity: 0.75;
      line-height: 1.35;
    }
    .preset-thumb {
      display: block;
      opacity: 0.65;
      margin-bottom: 2px;
      max-width: 100%;
    }
    @media (max-width: 430px) {
      .presets-panel {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-graph,
      .loading-curve,
      .loading-point {
        animation: none;
      }
    }
  `,e([ve()],bt.prototype,"_curves",void 0),e([ve()],bt.prototype,"_originalCurves",void 0),e([ve()],bt.prototype,"_config",void 0),e([ve()],bt.prototype,"_selectedCurveId",void 0),e([ve()],bt.prototype,"_saveState",void 0),e([ve()],bt.prototype,"_load",void 0),e([ve()],bt.prototype,"_manageError",void 0),e([ve()],bt.prototype,"_managingLights",void 0),e([ve()],bt.prototype,"_groupDeleted",void 0),e([ve()],bt.prototype,"_scrubberPosition",void 0),e([ve()],bt.prototype,"_cancelAnimating",void 0),e([ve()],bt.prototype,"_hass",void 0),e([ve()],bt.prototype,"_previewActive",void 0),e([ve()],bt.prototype,"_presetGraphTrial",void 0),e([ve()],bt.prototype,"_legendCloseRemoveSignal",void 0),e([ve()],bt.prototype,"_legendCloseAddSignal",void 0),e([ve()],bt.prototype,"_manageMode",void 0),be(me,bt);export{bt as LightenerCurveCard,ft as LightenerCurveCardEditor};
