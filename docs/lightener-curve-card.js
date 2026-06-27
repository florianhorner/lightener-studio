function t(t,e,i,r){var n,o=arguments.length,s=o<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,i,r);else for(var a=t.length-1;a>=0;a--)(n=t[a])&&(s=(o<3?n(s):o>3?n(e,i,s):n(e,i))||s);return o>3&&s&&Object.defineProperty(e,i,s),s}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),n=new WeakMap;let o=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(e,t))}return t}toString(){return this.cssText}};const s=t=>new o("string"==typeof t?t:t+"",void 0,r),a=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,r)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[r+1],t[0]);return new o(i,t,r)},l=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return s(e)})(t):t,{is:d,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:p,getOwnPropertySymbols:g,getPrototypeOf:u}=Object,v=globalThis,_=v.trustedTypes,f=_?_.emptyScript:"",m=v.reactiveElementPolyfillSupport,b=(t,e)=>t,y={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},x=(t,e)=>!d(t,e),$={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol("metadata"),v.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=$){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(t,i,e);void 0!==r&&c(this.prototype,t,r)}}static getPropertyDescriptor(t,e,i){const{get:r,set:n}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:r,set(e){const o=r?.call(this);n?.call(this,e),this.requestUpdate(t,o,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??$}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...p(t),...g(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,r)=>{if(i)t.adoptedStyleSheets=r.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of r){const r=document.createElement("style"),n=e.litNonce;void 0!==n&&r.setAttribute("nonce",n),r.textContent=i.cssText,t.appendChild(r)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),r=this.constructor._$Eu(t,i);if(void 0!==r&&!0===i.reflect){const n=(void 0!==i.converter?.toAttribute?i.converter:y).toAttribute(e,i.type);this._$Em=t,null==n?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(t,e){const i=this.constructor,r=i._$Eh.get(t);if(void 0!==r&&this._$Em!==r){const t=i.getPropertyOptions(r),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:y;this._$Em=r;const o=n.fromAttribute(e,t.type);this[r]=o??this._$Ej?.get(r)??o,this._$Em=null}}requestUpdate(t,e,i,r=!1,n){if(void 0!==t){const o=this.constructor;if(!1===r&&(n=this[t]),i??=o.getPropertyOptions(t),!((i.hasChanged??x)(n,e)||i.useDefault&&i.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:r,wrapped:n},o){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),!0!==n||void 0!==o)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===r&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,r=this[e];!0!==t||this._$AL.has(e)||void 0===r||this.C(e,void 0,i,r)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[b("elementProperties")]=new Map,w[b("finalized")]=new Map,m?.({ReactiveElement:w}),(v.reactiveElementVersions??=[]).push("2.1.2");const k=globalThis,C=t=>t,P=k.trustedTypes,A=P?P.createPolicy("lit-html",{createHTML:t=>t}):void 0,E="$lit$",I=`lit$${Math.random().toFixed(9).slice(2)}$`,S="?"+I,M=`<${S}>`,L=document,D=()=>L.createComment(""),T=t=>null===t||"object"!=typeof t&&"function"!=typeof t,R=Array.isArray,U="[ \t\n\f\r]",z=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,N=/>/g,B=RegExp(`>|${U}(?:([^\\s"'>=/]+)(${U}*=${U}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,F=/"/g,j=/^(?:script|style|textarea|title)$/i,G=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),q=G(1),V=G(2),K=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),X=new WeakMap,J=L.createTreeWalker(L,129);function Y(t,e){if(!R(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(e):e}const Z=(t,e)=>{const i=t.length-1,r=[];let n,o=2===e?"<svg>":3===e?"<math>":"",s=z;for(let e=0;e<i;e++){const i=t[e];let a,l,d=-1,c=0;for(;c<i.length&&(s.lastIndex=c,l=s.exec(i),null!==l);)c=s.lastIndex,s===z?"!--"===l[1]?s=O:void 0!==l[1]?s=N:void 0!==l[2]?(j.test(l[2])&&(n=RegExp("</"+l[2],"g")),s=B):void 0!==l[3]&&(s=B):s===B?">"===l[0]?(s=n??z,d=-1):void 0===l[1]?d=-2:(d=s.lastIndex-l[2].length,a=l[1],s=void 0===l[3]?B:'"'===l[3]?F:H):s===F||s===H?s=B:s===O||s===N?s=z:(s=B,n=void 0);const h=s===B&&t[e+1].startsWith("/>")?" ":"";o+=s===z?i+M:d>=0?(r.push(a),i.slice(0,d)+E+i.slice(d)+I+h):i+I+(-2===d?e:h)}return[Y(t,o+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),r]};class Q{constructor({strings:t,_$litType$:e},i){let r;this.parts=[];let n=0,o=0;const s=t.length-1,a=this.parts,[l,d]=Z(t,e);if(this.el=Q.createElement(l,i),J.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(r=J.nextNode())&&a.length<s;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(E)){const e=d[o++],i=r.getAttribute(t).split(I),s=/([.?@])?(.*)/.exec(e);a.push({type:1,index:n,name:s[2],strings:i,ctor:"."===s[1]?nt:"?"===s[1]?ot:"@"===s[1]?st:rt}),r.removeAttribute(t)}else t.startsWith(I)&&(a.push({type:6,index:n}),r.removeAttribute(t));if(j.test(r.tagName)){const t=r.textContent.split(I),e=t.length-1;if(e>0){r.textContent=P?P.emptyScript:"";for(let i=0;i<e;i++)r.append(t[i],D()),J.nextNode(),a.push({type:2,index:++n});r.append(t[e],D())}}}else if(8===r.nodeType)if(r.data===S)a.push({type:2,index:n});else{let t=-1;for(;-1!==(t=r.data.indexOf(I,t+1));)a.push({type:7,index:n}),t+=I.length-1}n++}}static createElement(t,e){const i=L.createElement("template");return i.innerHTML=t,i}}function tt(t,e,i=t,r){if(e===K)return e;let n=void 0!==r?i._$Co?.[r]:i._$Cl;const o=T(e)?void 0:e._$litDirective$;return n?.constructor!==o&&(n?._$AO?.(!1),void 0===o?n=void 0:(n=new o(t),n._$AT(t,i,r)),void 0!==r?(i._$Co??=[])[r]=n:i._$Cl=n),void 0!==n&&(e=tt(t,n._$AS(t,e.values),n,r)),e}class et{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,r=(t?.creationScope??L).importNode(e,!0);J.currentNode=r;let n=J.nextNode(),o=0,s=0,a=i[0];for(;void 0!==a;){if(o===a.index){let e;2===a.type?e=new it(n,n.nextSibling,this,t):1===a.type?e=new a.ctor(n,a.name,a.strings,this,t):6===a.type&&(e=new at(n,this,t)),this._$AV.push(e),a=i[++s]}o!==a?.index&&(n=J.nextNode(),o++)}return J.currentNode=L,r}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class it{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,r){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=tt(this,t,e),T(t)?t===W||null==t||""===t?(this._$AH!==W&&this._$AR(),this._$AH=W):t!==this._$AH&&t!==K&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>R(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==W&&T(this._$AH)?this._$AA.nextSibling.data=t:this.T(L.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,r="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Q.createElement(Y(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===r)this._$AH.p(e);else{const t=new et(r,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=X.get(t.strings);return void 0===e&&X.set(t.strings,e=new Q(t)),e}k(t){R(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,r=0;for(const n of t)r===e.length?e.push(i=new it(this.O(D()),this.O(D()),this,this.options)):i=e[r],i._$AI(n),r++;r<e.length&&(this._$AR(i&&i._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=C(t).nextSibling;C(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class rt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,r,n){this.type=1,this._$AH=W,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=W}_$AI(t,e=this,i,r){const n=this.strings;let o=!1;if(void 0===n)t=tt(this,t,e,0),o=!T(t)||t!==this._$AH&&t!==K,o&&(this._$AH=t);else{const r=t;let s,a;for(t=n[0],s=0;s<n.length-1;s++)a=tt(this,r[i+s],e,s),a===K&&(a=this._$AH[s]),o||=!T(a)||a!==this._$AH[s],a===W?t=W:t!==W&&(t+=(a??"")+n[s+1]),this._$AH[s]=a}o&&!r&&this.j(t)}j(t){t===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class nt extends rt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===W?void 0:t}}class ot extends rt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==W)}}class st extends rt{constructor(t,e,i,r,n){super(t,e,i,r,n),this.type=5}_$AI(t,e=this){if((t=tt(this,t,e,0)??W)===K)return;const i=this._$AH,r=t===W&&i!==W||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,n=t!==W&&(i===W||r);r&&this.element.removeEventListener(this.name,this,i),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class at{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){tt(this,t)}}const lt=k.litHtmlPolyfillSupport;lt?.(Q,it),(k.litHtmlVersions??=[]).push("3.3.2");const dt=globalThis;class ct extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const r=i?.renderBefore??e;let n=r._$litPart$;if(void 0===n){const t=i?.renderBefore??null;r._$litPart$=n=new it(e.insertBefore(D(),t),t,void 0,i??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}}ct._$litElement$=!0,ct.finalized=!0,dt.litElementHydrateSupport?.({LitElement:ct});const ht=dt.litElementPolyfillSupport;ht?.({LitElement:ct}),(dt.litElementVersions??=[]).push("4.2.2");const pt={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:x},gt=(t=pt,e,i)=>{const{kind:r,metadata:n}=i;let o=globalThis.litPropertyMetadata.get(n);if(void 0===o&&globalThis.litPropertyMetadata.set(n,o=new Map),"setter"===r&&((t=Object.create(t)).wrapped=!0),o.set(i.name,t),"accessor"===r){const{name:r}=i;return{set(i){const n=e.get.call(this);e.set.call(this,i),this.requestUpdate(r,n,t,!0,i)},init(e){return void 0!==e&&this.C(r,void 0,t,e),e}}}if("setter"===r){const{name:r}=i;return function(i){const n=this[r];e.call(this,i),this.requestUpdate(r,n,t,!0,i)}}throw Error("Unsupported decorator location: "+r)};function ut(t){return(e,i)=>"object"==typeof i?gt(t,e,i):((t,e,i)=>{const r=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),r?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function vt(t){return ut({...t,state:!0,attribute:!1})}const _t="lightener-curve-card",ft="custom:lightener-curve-card";function mt(t,e){return"light"===e.split(".")[0]&&"lightener"===t.entities?.[e]?.platform}function bt(t,e){customElements.get(t)||customElements.define(t,e)}class yt{constructor(t,e){this.isConnected=t,this.requestUpdate=e,this.ready=!1,this.started=!1}ensureLoaded(){if(this.started)return;if(this.started=!0,customElements.get("ha-entity-picker"))return void(this.ready=!0);(async()=>{try{const t=window.loadCardHelpers;"function"==typeof t&&await t()}catch{}try{const t=customElements.get("hui-entities-card");await(t?.getConfigElement?.())}catch{}})();const t=customElements.whenDefined("ha-entity-picker"),e=new Promise(t=>setTimeout(t,1500));Promise.race([t,e]).then(()=>{this.isConnected()&&(this.ready=!!customElements.get("ha-entity-picker"),this.ready||(console.warn("[lightener] <ha-entity-picker> not available — falling back to plain input."),customElements.whenDefined("ha-entity-picker").then(()=>{this.isConnected()&&(this.ready=!0,this.requestUpdate())}).catch(()=>{})),this.requestUpdate())}).catch(()=>{})}}function xt(t){return{...t,controlPoints:t.controlPoints.map(t=>({...t}))}}function $t(t){return t.map(xt)}function wt(t,e){const i=t.find(t=>t.entityId===e);return!!i&&i.visible}function kt(t,e){!function(t,e){t.push($t(e)),t.length>50&&t.shift()}(t,e)}function Ct(t,e,i){return function(t,e,i){const r=t[e];if(!r)return null;if(r.controlPoints.length<=2)return null;if(0===i)return null;if(!Number.isInteger(i)||i<0||i>=r.controlPoints.length)return null;const n=[...t],o={...n[e]};return o.controlPoints=o.controlPoints.filter((t,e)=>e!==i),n[e]=o,n}(t,e,i)}function Pt(t,e,i){const[r,n]=t,[o,s]=e;return r===n?o:o+(i-r)*(s-o)/(n-r)}function At(t){const e=new Map;let i=null;e.set(0,0);for(const r of t)0!==r.lightener||0===r.target?e.set(r.lightener,r.target):i=r.target;if(null===i||e.has(1)||e.set(1,i),!e.has(100)){let t=-1,i=100;for(const[r,n]of e)0!==r&&r>t&&(t=r,i=n);e.set(100,i)}const r=[];for(const[t,i]of e)r.push({lightener:t,target:i});return r.sort((t,e)=>t.lightener-e.lightener),r}function Et(t,e){return function(t,e){if(0===t.length)return 0;const i=Math.max(0,Math.min(100,e));if(i<=t[0].lightener)return t[0].target;for(let e=1;e<t.length;e++){const r=t[e-1],n=t[e];if(i===n.lightener)return n.target;if(i<n.lightener)return Pt([r.lightener,n.lightener],[r.target,n.target],i)}return t[t.length-1].target}(At(t),e)}const It=44,St=12,Mt=300,Lt=200;function Dt(t){return It+t/100*Mt}function Tt(t){return St+(1-t/100)*Lt}function Rt(t,e,i){return Math.max(e,Math.min(i,t))}function Ut(t){const e=t.length;if(0===e)return{dx:[],tangents:[]};if(1===e)return{dx:[],tangents:[0]};const i=[],r=[],n=[];for(let o=0;o<e-1;o++)i.push(t[o+1].x-t[o].x),r.push(t[o+1].y-t[o].y),n.push(0===i[o]?0:r[o]/i[o]);const o=new Array(e).fill(0);if(2===e)return o[0]=n[0],o[1]=n[0],{dx:i,tangents:o};o[0]=n[0],o[e-1]=n[e-2];for(let t=1;t<e-1;t++)0===n[t-1]||0===n[t]||n[t-1]*n[t]<=0?o[t]=0:o[t]=(n[t-1]+n[t])/2;for(let t=0;t<e-1;t++){if(0===n[t]){o[t]=0,o[t+1]=0;continue}const e=o[t]/n[t],i=o[t+1]/n[t],r=e*e+i*i;if(r>9){const s=3/Math.sqrt(r);o[t]=s*e*n[t],o[t+1]=s*i*n[t]}}return{dx:i,tangents:o}}function zt(t,e){return Math.max(0,Math.min(100,Et(t,e)))}function Ot(t,e){const i=At(t).map(t=>({x:t.lightener,y:t.target}));return Math.max(0,Math.min(100,function(t,e){if(t.length<2)return 0;if(2===t.length){const[i,r]=t,n=r.x-i.x;if(0===n)return i.y;const o=(e-i.x)/n;return i.y+o*(r.y-i.y)}const{dx:i,tangents:r}=Ut(t);let n=0;for(let i=0;i<t.length-1;i++){if(e<=t[i+1].x){n=i;break}n=i}const o=i[n]||1,s=Rt((e-t[n].x)/o,0,1),a=o/3,l=1-s;return l*l*l*t[n].y+3*l*l*s*(t[n].y+r[n]*a)+3*l*s*s*(t[n+1].y-r[n+1]*a)+s*s*s*t[n+1].y}(i,e)))}const Nt=["#42a5f5","#ef5350","#5c6bc0","#ffa726","#ab47bc","#1565c0","#ec407a","#8d6e63","#ffca28","#7e57c2"];const Bt=["","8 4","4 4","12 4 4 4","2 4"],Ht=["circle","square","diamond","triangle","bar"];const Ft=.25;class jt{constructor(t,e=300){this._host=t,this._intervalMs=e,this._active=!1,this._rafPending=!1,this._trailingTimer=null,this._restoreBrightness=new Map,this._lastBrightness=new Map,this._frameGeneration=0,this._pending=null,this.lastPreviewTime=0}get active(){return this._active}start(){const t=this._host.getHass();if(t&&!this._active){if(this._active=!0,this._host.setPreviewActive(!0),null===this._host.getScrubberPosition()){this._host.setScrubberPosition(50);const t=this._host.getStorageEntityId();t&&this._host.persistScrubberPosition(t,50)}this._restoreBrightness.clear(),this._lastBrightness.clear();for(const e of this._host.getCurves()){if(!e.visible)continue;const i=t.states[e.entityId];i&&this._restoreBrightness.set(e.entityId,"off"===i.state?null:i.attributes.brightness??void 0)}this.refresh(!0)}}stop(){if(!this._active)return;this._active=!1,this._host.setPreviewActive(!1),this._rafPending=!1,this._frameGeneration++,this._clearTrailingTimer();const t=this._host.getHass();if(t)for(const[e,i]of this._restoreBrightness)null===i?t.callService("light","turn_off",{entity_id:e,transition:Ft}).catch(()=>{}):void 0===i?t.callService("light","turn_on",{entity_id:e,transition:Ft}).catch(()=>{}):t.callService("light","turn_on",{entity_id:e,brightness:i,transition:Ft}).catch(()=>{});this._restoreBrightness.clear(),this._lastBrightness.clear()}disconnect(){this.stop(),this._clearTrailingTimer(),this._rafPending=!1,this._pending=null,this._frameGeneration++}refresh(t=!1){this._active&&(null===this._host.getScrubberPosition()&&this._host.setScrubberPosition(50),this.previewLights(this._host.getScrubberPosition()??50,t))}previewLights(t,e=!1){this._schedule({position:t,entityId:null},e)}previewSingleLight(t,e,i=!1,r){this._schedule({position:e,entityId:t,value:r},i)}_schedule(t,e){const i=this._host.getHass();if(!this._active||!i)return;this._pending=t,e&&(this.lastPreviewTime=0,this._rafPending=!1,this._frameGeneration++,null===t.entityId?this._lastBrightness.clear():this._lastBrightness.delete(t.entityId),this._clearTrailingTimer());const r=Date.now()-this.lastPreviewTime;if(r<this._intervalMs)return void(this._trailingTimer||(this._trailingTimer=setTimeout(()=>{this._trailingTimer=null,null!==this._pending&&this._schedule(this._pending,!1)},this._intervalMs-r)));if(this._rafPending)return;this._clearTrailingTimer(),this._rafPending=!0;const n=this._frameGeneration;requestAnimationFrame(()=>{if(n!==this._frameGeneration)return;this._rafPending=!1;const e=this._host.getHass();if(!this._active||!e)return;this.lastPreviewTime=Date.now();const i=this._pending??t;if(null===i.entityId)for(const t of this._host.getCurves())t.visible&&this._pushCurve(e,t,i.position);else{const t=this._host.getCurves().find(t=>t.entityId===i.entityId);t&&t.visible&&this._pushCurve(e,t,i.position,i.value)}})}_pushCurve(t,e,i,r){this._ensureRestoreSnapshot(t,e.entityId);const n=Math.round(Math.max(0,Math.min(100,r??zt(e.controlPoints,i)))),o=Math.round(n/100*255);if(0===o){if("off"===this._lastBrightness.get(e.entityId))return;this._lastBrightness.set(e.entityId,"off"),t.callService("light","turn_off",{entity_id:e.entityId,transition:Ft}).catch(()=>{})}else{if(this._lastBrightness.get(e.entityId)===o)return;this._lastBrightness.set(e.entityId,o),t.callService("light","turn_on",{entity_id:e.entityId,brightness:o,transition:Ft}).catch(()=>{})}}_ensureRestoreSnapshot(t,e){if(this._restoreBrightness.has(e))return;const i=t.states[e];i&&this._restoreBrightness.set(e,"off"===i.state?null:i.attributes.brightness??void 0)}_clearTrailingTimer(){this._trailingTimer&&(clearTimeout(this._trailingTimer),this._trailingTimer=null)}}const Gt=[{id:"linear",name:"Linear",description:"Equal brightness — what you set is what you get.",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}]},{id:"dim_accent",name:"Dim accent",description:"Caps at ~45% — great for mood or accent lighting.",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:25,target:8},{lightener:50,target:20},{lightener:100,target:45}]},{id:"late_starter",name:"Late starter",description:"Stays very dim until ~45%, then brightens quickly.",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:45,target:1},{lightener:70,target:45},{lightener:100,target:100}]},{id:"night_mode",name:"Night mode",description:"Caps at ~25% — barely bright even at full brightness.",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:20,target:3},{lightener:50,target:10},{lightener:100,target:25}]}];function qt(t,e,i){return!t.has(e)&&(0!==i.length&&i.every(t=>function(t){const e=Gt.find(t=>"linear"===t.id);return!!e&&t.length===e.controlPoints.length&&t.every((t,i)=>t.lightener===e.controlPoints[i].lightener&&t.target===e.controlPoints[i].target)}(t.controlPoints)))}function Vt(t){return`${t} light${1===t?"":"s"}`}function Kt(t){return[...t].sort((t,e)=>t.lightener-e.lightener).map(t=>`${t.lightener}:${t.target}`).join("|")}function Wt(t,e){if(!t.length)return null;const i=t.filter(t=>t.visible),r=t.length;if(!i.length)return{primary:"All lights are hidden",secondary:"Show a light in the list to bring its shape back.",visibleCount:0,totalCount:r,shapeCount:0,largestShapeCount:0};const n=function(t){const e=new Map;for(const i of t){const t=Kt(i.controlPoints),r=e.get(t)??[];r.push(i),e.set(t,r)}return e}(i),o=function(t){let e=[];for(const i of t.values())i.length>e.length&&(e=i);return e}(n),s=n.size,a=r-i.length,l=a>0?` ${a} hidden light${1===a?"":"s"}.`:"";if(e){const t=i.find(t=>t.entityId===e);if(t){const e=n.get(Kt(t.controlPoints))??[t],a=Math.max(0,e.length-1);return{primary:`Shaping ${t.friendlyName}`,secondary:a>0?`${Vt(a)} still share${1===a?"s":""} this shape.${l}`:`This light has its own shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:s,largestShapeCount:o.length}}}if(1===s&&i.length>1){return{primary:!!(d=o[0]?.controlPoints??[]).length&&d.every(t=>t.lightener===t.target)?`${Vt(i.length)} match the group brightness`:`${Vt(i.length)} share one brightness shape`,secondary:`Pick a light to make it dimmer, brighter, or delayed.${l}`,visibleCount:i.length,totalCount:r,shapeCount:s,largestShapeCount:o.length}}var d;return s===i.length?{primary:`${Vt(i.length)}, ${s} separate shapes`,secondary:`Pick a light to focus its shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:s,largestShapeCount:o.length}:{primary:`${Vt(i.length)}, ${s} brightness shapes`,secondary:`${Vt(o.length)} share the most common shape.${l}`,visibleCount:i.length,totalCount:r,shapeCount:s,largestShapeCount:o.length}}const Xt={title:"Try brightness",sliderAria:"Try group brightness",watchButton:"Watch room react",watchingPrefix:"Watching",watchingRestore:"Put it back",heldStatus:"Your room is showing this now",heldStatusSave:"Save to keep it"},Jt={save:"Save",saving:"Saving…",savePreview:"Save this room"},Yt={panelAria:"Starting shapes"},Zt={title:"Lights",emptyCount:"No lights yet",countAllVisible:t=>`${t} ${1===t?"light":"lights"} showing`,countWithHidden:(t,e)=>`${t} ${1===t?"light":"lights"} · ${e} hidden`,listAria:t=>0===t?"No lights in this group":`${t} ${1===t?"light":"lights"} in this group`},Qt={yAxisLabel:"Per-light brightness"};function te(t){return t.ready?q`<ha-entity-picker
      .hass=${t.hass}
      .value=${t.value}
      .includeDomains=${t.includeDomains}
      .includeEntities=${t.includeEntities}
      .excludeEntities=${t.excludeEntities??[]}
      allow-custom-entity
      @value-changed=${t.onValueChanged}
    ></ha-entity-picker>`:"change"===(t.fallbackEvent??"input")?q`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??W}
        @change=${t.onFallbackInput}
      />`:q`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??W}
        @input=${t.onFallbackInput}
      />`}function ee(t){return q`<svg
    class="preset-thumb"
    viewBox="0 0 64 40"
    width="64"
    height="40"
    aria-hidden="true"
  >
    <polyline
      points=${function(t){return t.controlPoints.map(t=>{const e=4+t.lightener/100*56,i=36-t.target/100*32;return`${e.toFixed(1)},${i.toFixed(1)}`}).join(" ")}(t)}
      fill="none"
      stroke="var(--accent, #2563eb)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></polyline>
  </svg>`}const ie={phase:"idle"};class re{constructor(t,e=8e3,i=2e3){this._host=t,this._confirmTimeoutMs=e,this._successDisplayMs=i,this._confirmTimer=null,this._successTimer=null,this._generation=0,this._resolve=null}currentGeneration(){return this._generation}arm(){const t=++this._generation;this._clearConfirmTimer(),this._settle("error");const e=new Promise(e=>{this._resolve=e,this._confirmTimer=setTimeout(()=>{this._confirmTimer=null,this._generation===t&&"confirming"===this._host.getSavePhase()&&this._host.dispatchSave({type:"save-error",message:"Save confirmation timed out."})},this._confirmTimeoutMs)});return{generation:t,settled:e}}confirm(t){"confirming"===this._host.getSavePhase()&&t===this._generation&&(this._host.dispatchSave({type:"save-confirmed"}),this._clearSuccessTimer(),this._successTimer=setTimeout(()=>{this._successTimer=null,this._host.dispatchSave({type:"save-clear"})},this._successDisplayMs))}fail(t,e){"confirming"===this._host.getSavePhase()&&t===this._generation&&this._host.dispatchSave({type:"save-error",message:e})}onLeaveConfirming(t,e){this._clearConfirmTimer(),e&&this._settle("error"===t?"error":"confirmed")}settleError(){this._settle("error")}dispose(){this._clearSuccessTimer(),this._clearConfirmTimer(),this._settle("error")}_settle(t){const e=this._resolve;e&&(this._resolve=null,e(t))}_clearConfirmTimer(){this._confirmTimer&&(clearTimeout(this._confirmTimer),this._confirmTimer=null)}_clearSuccessTimer(){this._successTimer&&(clearTimeout(this._successTimer),this._successTimer=null)}}const ne={loaded:!1,loading:!1,loadError:null};function oe(t,e){const i={...t,loaded:!1};return i.loading?{state:{...i,reloadAfterLoadEntityId:e},runNow:!1}:{state:i,runNow:!0}}function se(t){return{...t,loaded:!1,loadedEntityId:void 0}}const ae=a`(max-width: ${s(500)}px)`;class le extends ct{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.entityId=null,this.readOnly=!1,this.scrubberPosition=null,this._dragCurveIdx=-1,this._dragPointIdx=-1,this._hoveredPoint=null,this._focusedPoint=null,this._isMobile=!1,this._uid=Math.random().toString(36).slice(2,7),this._mql=null,this._wasDragging=!1,this._longPressTimer=null,this._longPressFired=!1,this._onMqlChange=t=>{this._isMobile=t.matches}}_getSvgCoords(t){const e=this._svgRef;if(!e)return null;const i=e.getScreenCTM();if(!i)return null;let r;try{r=i.inverse()}catch{return null}if(!r||isNaN(r.a))return null;const n=e.createSVGPoint();n.x=t.clientX,n.y=t.clientY;const o=n.matrixTransform(r);return{x:(a=o.x,(a-It)/Mt*100),y:(s=o.y,100*(1-(s-St)/Lt))};var s,a}_isCurveInteractive(t){return!this.readOnly&&(null===this.selectedCurveId||this.curves[t]?.entityId===this.selectedCurveId)}_focusCurve(t){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_onPointFocus(t,e){const i=this.curves[t];i&&(this._focusedPoint={curve:t,point:e},this._hoveredPoint={curve:t,point:e},this._focusCurve(i.entityId))}_onPointBlur(t,e){this._focusedPoint?.curve===t&&this._focusedPoint?.point===e&&(this._focusedPoint=null),this._hoveredPoint?.curve===t&&this._hoveredPoint?.point===e&&(this._hoveredPoint=null)}_dispatchKeyboardMove(t,e,i,r){this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:t,pointIndex:e,lightener:i,target:r},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:t,pointIndex:e},bubbles:!0,composed:!0}))}_getKeyboardInsertPoint(t,e){const i=t.controlPoints[e],r=t.controlPoints[e+1],n=t.controlPoints[e-1];return r&&r.lightener-i.lightener>1?{lightener:Math.round((i.lightener+r.lightener)/2),target:Math.round((i.target+r.target)/2)}:n&&i.lightener-n.lightener>1?{lightener:Math.round((n.lightener+i.lightener)/2),target:Math.round((n.target+i.target)/2)}:null}_onPointKeyDown(t,e,i){const r=this.curves[e],n=r?.controlPoints[i];if(!r||!n)return;if(this.selectedCurveId!==r.entityId&&this._focusCurve(r.entityId),0===i&&("ArrowRight"===t.key||"ArrowLeft"===t.key))return;const o=t.shiftKey?10:1,s=i>0?r.controlPoints[i-1].lightener+1:n.lightener,a=i<r.controlPoints.length-1?r.controlPoints[i+1].lightener-1:100;if("ArrowRight"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.min(a,n.lightener+o),n.target);if("ArrowLeft"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.max(s,n.lightener-o),n.target);if("ArrowUp"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,n.lightener,Math.min(100,n.target+o));if("ArrowDown"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,n.lightener,Math.max(0,n.target-o));if("Enter"===t.key){const n=this._getKeyboardInsertPoint(r,i);if(!n)return;return t.preventDefault(),this.dispatchEvent(new CustomEvent("point-add",{detail:{entityId:r.entityId,lightener:n.lightener,target:n.target},bubbles:!0,composed:!0})),void this.updateComplete.then(()=>this._refocusHitCircle(e,i)).catch(()=>{})}(" "===t.key||"Delete"===t.key||"Backspace"===t.key)&&i>0&&r.controlPoints.length>2&&(t.preventDefault(),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})),this.updateComplete.then(()=>this._refocusHitCircle(e,Math.max(1,i-1))).catch(()=>{}))}_refocusHitCircle(t,e){const i=this.renderRoot.querySelector(`.hit-circle[data-curve="${t}"][data-point="${e}"]`);i&&i.focus()}_onPointerDown(t,e,i){0===t.button&&this._isCurveInteractive(e)&&(t.preventDefault(),this._longPressFired=!1,this._clearLongPress(),i>0&&(this._longPressTimer=setTimeout(()=>{this._longPressFired=!0,this._dragCurveIdx=-1,this._dragPointIdx=-1,this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0}))},500)),this._svgRef?.setPointerCapture(t.pointerId),this._dragCurveIdx=e,this._dragPointIdx=i)}_clearLongPress(){this._longPressTimer&&(clearTimeout(this._longPressTimer),this._longPressTimer=null)}_onPointerMove(t){if(this._dragCurveIdx<0)return;t.preventDefault(),this._clearLongPress();const e=this._getSvgCoords(t);if(!e)return;const i=this.curves[this._dragCurveIdx],r=i?.controlPoints??[],n=this._dragPointIdx>0?r[this._dragPointIdx-1].lightener+1:1,o=this._dragPointIdx<r.length-1?r[this._dragPointIdx+1].lightener-1:100,s=0===this._dragPointIdx?this.curves[this._dragCurveIdx]?.controlPoints[0]?.lightener??0:Math.round(Rt(e.x,n,o)),a=Math.round(Rt(e.y,0,100));this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx,lightener:s,target:a},bubbles:!0,composed:!0}))}_onPointerUp(t){this._clearLongPress(),this._longPressFired||this._dragCurveIdx<0||(t.preventDefault(),this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx},bubbles:!0,composed:!0})),this._dragCurveIdx=-1,this._dragPointIdx=-1,this._wasDragging=!0,setTimeout(()=>{this._wasDragging=!1},400))}_onPointContextMenu(t,e,i){t.preventDefault(),t.stopPropagation(),this.readOnly||this._isCurveInteractive(e)&&0!==i&&this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0}))}_onDblClick(t){if(this.readOnly)return;if(this._wasDragging)return;const e=this._getSvgCoords(t);if(!e)return;const i=Math.round(Rt(e.x,1,100)),r=Math.round(Rt(e.y,0,100));this.dispatchEvent(new CustomEvent("point-add",{detail:{lightener:i,target:r,entityId:this.selectedCurveId},bubbles:!0,composed:!0}))}_renderGrid(){return V`
      <defs>
        <clipPath id="graph-area-${this._uid}">
          <rect x="${14}" y="${-18}" width="${360}" height="${260}" />
        </clipPath>
      </defs>

      <rect class="plot-frame"
        x="${It}" y="${St}"
        width="${Mt}" height="${Lt}" />

      ${[0,25,50,75,100].map(t=>V`
        <!-- Vertical grid -->
        <line class="grid-line"
          x1="${Dt(t)}" y1="${Tt(0)}"
          x2="${Dt(t)}" y2="${Tt(100)}" />
        <!-- Horizontal grid -->
        <line class="grid-line"
          x1="${Dt(0)}" y1="${Tt(t)}"
          x2="${Dt(100)}" y2="${Tt(t)}" />
        <!-- X tick labels -->
        <text class="tick-label" text-anchor="middle"
          x="${Dt(t)}" y="${228}">${t}%</text>
        <!-- Y tick labels -->
        <text class="tick-label" text-anchor="end" dominant-baseline="middle"
          x="${38}" y="${Tt(t)}">${t}%</text>
      `)}

      <!-- Axis border lines -->
      <line class="axis-line"
        x1="${It}" y1="${Tt(0)}"
        x2="${344}" y2="${Tt(0)}" />
      <line class="axis-line"
        x1="${It}" y1="${Tt(0)}"
        x2="${It}" y2="${Tt(100)}" />

      <!-- Axis labels: x-axis is labeled by the slider above the graph; the
           y-axis label stays inline (no other surface labels it). -->
      <text class="axis-label" text-anchor="middle"
        transform="rotate(-90, 10, ${112})"
        x="10" y="${112}">${Qt.yAxisLabel}</text>
    `}_renderCrossHair(t){if(this._dragCurveIdx<0)return W;const e=t.controlPoints[this._dragPointIdx];if(!e)return W;const i=Dt(e.lightener),r=Tt(e.target);return V`
      <line class="crosshair"
        x1="${i}" y1="${r}"
        x2="${i}" y2="${Tt(0)}"
        stroke="${t.color}" opacity="0.5" />
      <line class="crosshair"
        x1="${i}" y1="${r}"
        x2="${It}" y2="${r}"
        stroke="${t.color}" opacity="0.5" />
    `}_renderTooltip(t){const e=Dt(t.lightener),i=Tt(t.target),r=`Group ${t.lightener}% -> Light ${t.target}%`,n=Math.ceil(4.9*r.length),o=Rt(e-n/2-2,It,344-n-8),s=Math.max(16,i-16);return V`
      <rect class="tooltip-bg"
        x="${o}" y="${s-8}"
        width="${n+8}" height="14" />
      <text class="tooltip-text" text-anchor="start"
        x="${o+4}" y="${s+2}">${r}</text>
    `}_renderScrubberIndicator(){if(null===this.scrubberPosition)return W;const t=this.scrubberPosition,e=Dt(t),i=V`
      <rect
        x="${e}" y="${Tt(100)}"
        width="${Dt(100)-e}" height="${Lt}"
        fill="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))"
        fill-opacity="0.93"
        pointer-events="none"
      />
    `,r=V`
      <line class="scrubber-line"
        x1="${e}" y1="${Tt(0)}"
        x2="${e}" y2="${Tt(100)}" />
    `,n=this.curves.filter(t=>t.visible).map(i=>{const r=Tt(Ot(i.controlPoints,t));return V`
          <circle
            class="scrubber-dot"
            cx="${e}" cy="${r}"
            r="4"
            fill="${i.color}"
            filter="url(#scrubber-glow-${i.color.replace("#","")}-${this._uid})"
            pointer-events="none"
          />
        `});return V`${i}${r}${n}`}_orderedCurves(){const t=this.selectedCurveId?this.curves.findIndex(t=>t.entityId===this.selectedCurveId):-1;return t>=0?[...this.curves.slice(0,t).map((t,e)=>({curve:t,idx:e})),...this.curves.slice(t+1).map((e,i)=>({curve:e,idx:t+1+i})),{curve:this.curves[t],idx:t}]:this.curves.map((t,e)=>({curve:t,idx:e}))}_renderCurvePaths(t,e){if(!t.visible||!t.controlPoints.length)return W;try{const i=null===this.selectedCurveId||t.entityId===this.selectedCurveId,r=this._dragCurveIdx===e,n=i?1:.2,o=At(t.controlPoints),s=function(t){if(t.length<2)return"";if(2===t.length)return`M${t[0].x},${t[0].y} L${t[1].x},${t[1].y}`;const{dx:e,tangents:i}=Ut(t);let r=`M${t[0].x},${t[0].y}`;for(let n=0;n<t.length-1;n++){const o=e[n]/3;r+=` C${t[n].x+o},${t[n].y+i[n]*o} ${t[n+1].x-o},${t[n+1].y-i[n+1]*o} ${t[n+1].x},${t[n+1].y}`}return r}(o.map(t=>({x:Dt(t.lightener),y:Tt(t.target)}))),a=s+` L${Dt(o[o.length-1].lightener)},${Tt(0)}`+` L${Dt(0)},${Tt(0)} Z`,l=`grad-${e}-${this._uid}`,d=null===this.selectedCurveId?Bt[e%Bt.length]:t.entityId===this.selectedCurveId?"":Bt[e%(Bt.length-1)+1],c=null!==this.selectedCurveId&&t.entityId===this.selectedCurveId;return V`
        ${c?V`
              <defs>
                <linearGradient id="${l}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${t.color}" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="${t.color}" stop-opacity="0.08" />
                </linearGradient>
              </defs>
              <path
                d="${a}"
                fill="url(#${l})"
                style="opacity: ${n}"
                pointer-events="none"
              />`:W}
        ${r?this._renderCrossHair(t):W}
        <path
          class="curve-line"
          d="${s}"
          stroke="${t.color}"
          stroke-dasharray="${d}"
          style="opacity: ${n}"
          pointer-events="none"
        />
      `}catch{return W}}_renderCurvePoints(t,e){if(!t.visible||!t.controlPoints.length)return W;try{const i=this._isCurveInteractive(e);if(!(i&&!this.readOnly))return W;const r=this._dragCurveIdx===e,n=t.color+"33";let o=null;if(r&&this._dragPointIdx>=0)o=t.controlPoints[this._dragPointIdx];else if(this._hoveredPoint?.curve===e||this._focusedPoint?.curve===e){const i=this._focusedPoint?.curve===e?this._focusedPoint.point:this._hoveredPoint?.point??-1;o=t.controlPoints[i]??null}return V`
        ${t.controlPoints.map((i,o)=>{const s=0===o,a=r&&this._dragPointIdx===o,l=this._hoveredPoint?.curve===e&&this._hoveredPoint?.point===o,d=null!==this.scrubberPosition&&i.lightener>this.scrubberPosition?.35:1;return V`
            <circle
              class="hit-circle ${s?"origin-hit":""}"
              data-curve="${e}"
              data-point="${o}"
              cx="${Dt(i.lightener)}"
              cy="${Tt(i.target)}"
              r="${this._isMobile?28:22}"
              fill="transparent"
              pointer-events="all"
              tabindex="0"
              role="button"
              aria-label="${t.friendlyName} point ${i.lightener}% group brightness to ${i.target}% light brightness. ${0===o?"Arrow Up/Down to adjust starting brightness. Cannot be moved horizontally.":"Arrow keys move, Enter adds a nearby point, Space removes."}"
              style="touch-action: none; -webkit-touch-callout: none"
              @pointerdown=${t=>this._onPointerDown(t,e,o)}
              @contextmenu=${t=>this._onPointContextMenu(t,e,o)}
              @pointerenter=${()=>this._hoveredPoint={curve:e,point:o}}
              @pointerleave=${()=>this._hoveredPoint=null}
              @pointercancel=${()=>{this._hoveredPoint=null,this._focusedPoint=null}}
              @focus=${()=>this._onPointFocus(e,o)}
              @blur=${()=>this._onPointBlur(e,o)}
              @keydown=${t=>this._onPointKeyDown(t,e,o)}
            />
            ${function(t,e,i,r,n,o,s,a,l){const d=`--glow-color: ${l}; opacity: ${a}`;switch(t){case"circle":return V`<circle
        class="${n}"
        cx="${e}"
        cy="${i}"
        r="${r}"
        fill="${o}"
        stroke="${s}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`;case"square":{const t=1.15*r;return V`<rect
        class="${n}"
        x="${e-t/2}"
        y="${i-t/2}"
        width="${t}"
        height="${t}"
        rx="1.5"
        fill="${o}"
        stroke="${s}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}case"diamond":{const t=1.3*r;return V`<rect
        class="${n}"
        x="${e-t/2}"
        y="${i-t/2}"
        width="${t}"
        height="${t}"
        rx="1"
        transform="rotate(45 ${e} ${i})"
        fill="${o}"
        stroke="${s}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}case"triangle":{const t=1.15*r,a=1.3*r;return V`<polygon
        class="${n}"
        points="${e},${i-t} ${e-a},${i+.65*t} ${e+a},${i+.65*t}"
        fill="${o}"
        stroke="${s}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}case"bar":{const t=2*r,a=.75*r;return V`<rect
        class="${n}"
        x="${e-t/2}"
        y="${i-a/2}"
        width="${t}"
        height="${a}"
        rx="1.5"
        fill="${o}"
        stroke="${s}"
        stroke-width="2"
        style="${d}"
        pointer-events="none"
      />`}default:return t}}(Ht[e%Ht.length],Dt(i.lightener),Tt(i.target),6,`control-point ${s?"origin":""} ${a?"dragging":""} ${l?"hovered":""} ${this._focusedPoint?.curve===e&&this._focusedPoint?.point===o?"focused":""}`,n,t.color,d,t.color)}
          `})}
        ${null!==o?this._renderTooltip(o):W}
      `}catch{return W}}connectedCallback(){super.connectedCallback(),this._mql=window.matchMedia("(max-width: 500px)"),this._isMobile=this._mql.matches,this._mql.addEventListener("change",this._onMqlChange)}disconnectedCallback(){super.disconnectedCallback(),this._clearLongPress(),this._mql?.removeEventListener("change",this._onMqlChange),this._mql=null}_getSvgDescription(){const t=this.curves.filter(t=>t.visible);if(!t.length)return"No curves displayed";const e=t.map(t=>{const e=t.controlPoints.reduce((t,e)=>Number.isFinite(e.target)?Math.max(t,e.target):t,0);return`${t.friendlyName} (${t.controlPoints.length} points, max ${e}%)`});return`${t.length} curve${1===t.length?"":"s"}: ${e.join(", ")}`}_renderCenteredHintBand(t,e,i,r){return V`
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
    `}render(){return q`
      <svg
        viewBox="0 0 ${356} ${248}"
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
        ${this.readOnly?W:q`<rect
              class="hit-area"
              x="${It}"
              y="${St}"
              width="${Mt}"
              height="${Lt}"
              pointer-events="all"
              fill="transparent"
            />`}
        <!-- Phase 1: curve fills and lines (rendered before scrubber overlay) -->
        ${(()=>{const t=this._orderedCurves();return V`<g clip-path="url(#graph-area-${this._uid})">${t.map(({curve:t,idx:e})=>this._renderCurvePaths(t,e))}</g>`})()}
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
        ${this._renderScrubberIndicator()}
        <!-- Phase 3: control points rendered after scrubber overlay so they are always visible -->
        ${(()=>{const t=this._orderedCurves();return V`<g clip-path="url(#graph-area-${this._uid})">${t.map(({curve:t,idx:e})=>this._renderCurvePoints(t,e))}</g>`})()}
        ${(()=>{if(this.readOnly)return W;if(0===this.curves.length){const t=112;return this._renderCenteredHintBand(220,32,t,V`<text class="hint hint-select" text-anchor="middle"
                x="${194}" y="${t+4}"
                pointer-events="none"
                >Add a light below to get started</text>`)}return W})()}
      </svg>
    `}}le.styles=a`
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
    @media ${ae} {
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
    }
    .tooltip-text {
      fill: var(--tooltip-text-color, var(--card-background-color, #fff));
      font-size: 9.5px;
      font-family: inherit;
    }
  `,t([ut({type:Array})],le.prototype,"curves",void 0),t([ut({type:String})],le.prototype,"selectedCurveId",void 0),t([ut({type:String})],le.prototype,"entityId",void 0),t([ut({type:Boolean})],le.prototype,"readOnly",void 0),t([ut({type:Number})],le.prototype,"scrubberPosition",void 0),t([vt()],le.prototype,"_dragCurveIdx",void 0),t([vt()],le.prototype,"_dragPointIdx",void 0),t([vt()],le.prototype,"_hoveredPoint",void 0),t([vt()],le.prototype,"_focusedPoint",void 0),t([vt()],le.prototype,"_isMobile",void 0),t([function(t){return(e,i,r)=>((t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,i),i))(e,i,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}("svg")],le.prototype,"_svgRef",void 0),bt("curve-graph",le);class de extends ct{constructor(){super(...arguments),this.curves=[],this.readOnly=!1,this.previewActive=!1,this.canPreview=!1,this.dirty=!1,this.position=null,this._dragging=!1,this._trackRef=null}_onPointerDown(t){this.readOnly||(t.preventDefault(),this._dragging=!0,t.target.setPointerCapture(t.pointerId),this._updatePositionFromClient(t.clientX),this.dispatchEvent(new CustomEvent("scrubber-start",{bubbles:!0,composed:!0})))}_onPointerMove(t){this._dragging&&(t.preventDefault(),this._updatePositionFromClient(t.clientX))}_onPointerUp(){this._dragging&&(this._dragging=!1,this.dispatchEvent(new CustomEvent("scrubber-end",{bubbles:!0,composed:!0})))}_onTrackClick(t){this.readOnly||this._updatePositionFromClient(t.clientX)}_onKeyDown(t){if(this.readOnly)return;const e=t.shiftKey?10:1,i=Math.min(100,Math.max(0,this.position??50));let r;if("ArrowRight"===t.key||"ArrowUp"===t.key)t.preventDefault(),r=Math.min(100,i+e);else if("ArrowLeft"===t.key||"ArrowDown"===t.key)t.preventDefault(),r=Math.max(0,i-e);else if("Home"===t.key)t.preventDefault(),r=0;else{if("End"!==t.key)return;t.preventDefault(),r=100}this._emitPosition(r)}_updatePositionFromClient(t){const e=this._trackRef;if(!e)return;const i=e.getBoundingClientRect(),r=(t-i.left)/i.width*100,n=Math.max(0,Math.min(100,r));this._emitPosition(n)}_emitPosition(t){this.dispatchEvent(new CustomEvent("scrubber-move",{detail:{position:t},bubbles:!0,composed:!0}))}_onPreviewToggle(){this.dispatchEvent(new CustomEvent("preview-toggle",{bubbles:!0,composed:!0}))}firstUpdated(){this._trackRef=this.renderRoot.querySelector(".track-area"),requestAnimationFrame(()=>{this.classList.add("is-loaded")})}render(){const t=Math.min(100,Math.max(0,this.position??50)),e=Math.round(t);return q`
      <div class="scrubber-panel">
        <div class="scrubber-header">
          <div class="scrubber-heading">
            <div class="scrubber-title">${Xt.title}</div>
          </div>
          ${this.canPreview?this.previewActive?q`<button class="preview-toggle-btn active" @click=${this._onPreviewToggle}>
                  <span class="preview-live-dot"></span>
                  ${Xt.watchingPrefix} &nbsp;·&nbsp;
                  <span class="preview-restore-text">${Xt.watchingRestore}</span>
                </button>`:q`<button class="preview-toggle-btn" @click=${this._onPreviewToggle}>
                  ${Xt.watchButton}
                </button>`:W}
        </div>
        ${this.previewActive&&this.dirty?q`<div class="preview-status">
              ${Xt.heldStatus} &nbsp;·&nbsp; ${Xt.heldStatusSave}
            </div>`:W}
        <div
          class="track-area"
          role="slider"
          tabindex="${this.readOnly?-1:0}"
          aria-disabled="${this.readOnly}"
          aria-label=${Xt.sliderAria}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${e}
          aria-valuetext="${e}% group brightness"
          @click=${this._onTrackClick}
          @keydown=${this._onKeyDown}
        >
          <div class="track-bg"></div>
          <div class="track-fill" style="width: ${t}%"></div>
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
    `}}de.styles=a`
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
      margin-left: ${It/356*100}%;
      margin-right: ${12/356*100}%;
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
    @media ${ae} {
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
  `,t([ut({type:Array})],de.prototype,"curves",void 0),t([ut({type:Boolean})],de.prototype,"readOnly",void 0),t([ut({type:Boolean})],de.prototype,"previewActive",void 0),t([ut({type:Boolean})],de.prototype,"canPreview",void 0),t([ut({type:Boolean})],de.prototype,"dirty",void 0),t([ut({type:Number})],de.prototype,"position",void 0),t([vt()],de.prototype,"_dragging",void 0),bt("curve-scrubber",de);const ce=/[\s\-–—/:]/;class he extends ct{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.scrubberPosition=null,this.canManage=!1,this.managing=!1,this.manageMode=!1,this.closeRemoveSignal=0,this.closeAddSignal=0,this.groupEntityId=null,this.hass=null,this._confirmingRemove=null,this._confirmingDeleteGroup=!1,this._addingLight=!1,this._pendingAddEntity="",this._pendingPreset=Gt[0]?.id??"linear",this._picker=new yt(()=>this.isConnected,()=>this.requestUpdate())}_select(t){this._confirmingRemove!==t&&this.dispatchEvent(new CustomEvent("select-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_toggle(t,e){t.stopPropagation(),this.dispatchEvent(new CustomEvent("toggle-curve",{detail:{entityId:e},bubbles:!0,composed:!0}))}_clearSelection(t,e){t.stopPropagation(),this._select(e)}willUpdate(t){super.willUpdate(t),!t.has("canManage")&&!t.has("managing")||this.canManage&&!this.managing||(this._confirmingRemove=null,this._confirmingDeleteGroup=!1),t.has("manageMode")&&!this.manageMode&&(this._confirmingDeleteGroup=!1),t.has("closeRemoveSignal")&&(this._confirmingRemove=null),t.has("closeAddSignal")&&this._cancelAdd(),t.has("canManage")&&!this.canManage&&this._cancelAdd()}_startRemove(t,e){t.stopPropagation(),this.canManage&&!this.managing&&(this.curves.length<=1||(this._cancelAdd(),this._confirmingRemove=e,this.dispatchEvent(new CustomEvent("remove-panel-open",{bubbles:!0,composed:!0}))))}_cancelRemove(t){t.stopPropagation(),this._confirmingRemove=null}_confirmRemove(t,e){t.stopPropagation(),this.canManage&&!this.managing?(this._confirmingRemove=null,this.dispatchEvent(new CustomEvent("remove-light",{detail:{entityId:e},bubbles:!0,composed:!0}))):this._confirmingRemove=null}_onItemKeyDown(t,e){if(this._confirmingRemove!==e&&("ArrowDown"===t.key||"ArrowUp"===t.key)){t.preventDefault();const e=[...this.renderRoot.querySelectorAll(".row-select-btn")],i=e.indexOf(t.currentTarget),r="ArrowDown"===t.key?i+1:i-1;e[r]?.focus()}}_onToggleKeyDown(t,e){"Enter"!==t.key&&" "!==t.key||(t.preventDefault(),this._toggle(t,e))}_startAdd(){this.canManage&&!this.managing&&(this._picker.ensureLoaded(),this._confirmingRemove=null,this._confirmingDeleteGroup=!1,this._addingLight=!0,this._pendingAddEntity="",this._pendingPreset=Gt[0]?.id??"linear",this.dispatchEvent(new CustomEvent("add-panel-open",{bubbles:!0,composed:!0})))}_cancelAdd(){this._addingLight=!1,this._pendingAddEntity=""}_onAddEntityChange(t){this._pendingAddEntity=(t.detail?.value??"").trim()}_onFallbackAddEntityInput(t){this._pendingAddEntity=t.target.value.trim()}_onPresetSelect(t){this._pendingPreset=t}_onPresetKeydown(t){const e="ArrowRight"===t.key||"ArrowDown"===t.key,i="ArrowLeft"===t.key||"ArrowUp"===t.key;if(!e&&!i)return;t.preventDefault();const r=Gt.map(t=>t.id);if(0===r.length)return;const n=Math.max(0,r.indexOf(this._pendingPreset)),o=r[(n+(e?1:r.length-1))%r.length];this._onPresetSelect(o),this.updateComplete.then(()=>{this.renderRoot?.querySelector(`.preset-option[data-preset="${o}"]`)?.focus()})}_confirmAdd(){if(!this.canManage||this.managing)return;const t=this._pendingAddEntity.trim();t&&this.dispatchEvent(new CustomEvent("add-light",{detail:{entityId:t,preset:this._pendingPreset},bubbles:!0,composed:!0}))}_renderAddForm(){const t=[...this.groupEntityId?[this.groupEntityId]:[],...this.curves.map(t=>t.entityId)];return q`
      <div class="add-form">
        ${te({ready:this._picker.ready,hass:this.hass,value:this._pendingAddEntity,includeDomains:["light"],excludeEntities:t,placeholder:"light.entity_id",onValueChanged:this._onAddEntityChange,onFallbackInput:this._onFallbackAddEntityInput})}
        <div class="preset-field">
          <label id="preset-grid-label">Start shape</label>
          <div
            class="preset-grid"
            role="radiogroup"
            aria-labelledby="preset-grid-label"
            @keydown=${this._onPresetKeydown}
          >
            ${Gt.map(t=>{const e=t.id===this._pendingPreset;return q`
                <button
                  type="button"
                  class="preset-option ${e?"active":""}"
                  data-preset=${t.id}
                  role="radio"
                  aria-checked=${e?"true":"false"}
                  tabindex=${e?"0":"-1"}
                  @click=${()=>this._onPresetSelect(t.id)}
                >
                  ${ee(t)}
                  <span class="preset-name">${t.name}</span>
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
    `}_renderConfirmRow(t){return q`
      <div class="confirm-row">
        <span class="confirm-text">Remove "${t.friendlyName}"?</span>
        <button type="button" class="confirm-btn" @click=${t=>this._cancelRemove(t)}>
          Cancel
        </button>
        <button
          type="button"
          class="confirm-btn danger"
          @click=${e=>this._confirmRemove(e,t.entityId)}
        >
          Remove
        </button>
      </div>
    `}render(){const t=function(t){if(t.length<2)return t.map(t=>({prefix:"",discriminator:t}));let e=t[0].length;for(let i=1;i<t.length;i++){const r=t[0],n=t[i];let o=0;for(;o<e&&o<n.length&&r.charCodeAt(o)===n.charCodeAt(o);)o++;if(e=o,0===e)break}const i=t[0];for(;e>0&&!ce.test(i[e-1]);)e--;let r=e;for(;r>0&&ce.test(i[r-1]);)r--;if(0===r)return t.map(t=>({prefix:"",discriminator:t}));const n=i.slice(0,r),o=t.map(t=>({prefix:n,discriminator:t.slice(e).replace(/^[\s\-–—/:]+/,"")}));return o.some(t=>0===t.discriminator.length)?t.map(t=>({prefix:"",discriminator:t})):o}(this.curves.map(t=>t.friendlyName)),e=this.curves.filter(t=>t.visible).length,i=this.curves.length-e,r=0===this.curves.length?Zt.emptyCount:0===i?Zt.countAllVisible(this.curves.length):Zt.countWithHidden(this.curves.length,i),n=this.curves.length>=20;return q`
      <div
        class="legend-panel ${n?"large-group":""}"
        data-density=${n?"large":"normal"}
      >
        <div class="legend-header">
          <div class="legend-label">${Zt.title}</div>
          <div class="legend-count" title=${r}>${r}</div>
        </div>
        <div class="legend" role="list" aria-label=${Zt.listAria(this.curves.length)}>
          ${this.curves.map((e,i)=>{const r=this.canManage&&!this.managing&&this._confirmingRemove===e.entityId,n=t[i],o=this.selectedCurveId===e.entityId;return q`
              <div
                class="legend-item ${e.visible?"":"hidden"} ${o?"selected":""} ${r?"confirming":""} ${this.manageMode?"manage-mode":""}"
                role="listitem"
                style="--accent-color: ${e.color}"
              >
                ${r?this._renderConfirmRow(e):q`
                      <button
                        type="button"
                        class="row-select-btn"
                        aria-pressed=${o?"true":"false"}
                        @click=${()=>this._select(e.entityId)}
                        @keydown=${t=>this._onItemKeyDown(t,e.entityId)}
                      >
                        <span
                          class="color-dot shape-${he._shapes[i%he._shapes.length]}"
                          style="background: ${e.color}; --dot-color: ${e.color}"
                        ></span>
                        <span class="name-block">
                          <span class="name discriminator" title=${e.friendlyName}
                            >${n.discriminator}</span
                          >
                          ${n.prefix?q`<span class="prefix">${n.prefix}</span>`:W}
                          <span class="entity-id" title=${e.entityId}>${e.entityId}</span>
                        </span>
                        ${null!==this.scrubberPosition?q`<span class="brightness-value"
                              >${Math.round(zt(e.controlPoints,Math.round(this.scrubberPosition)))}%</span
                            >`:W}
                      </button>
                      ${o?q`
                            <button
                              type="button"
                              class="clear-edit-icon"
                              aria-label="Clear selection for ${e.friendlyName}"
                              title="Clear selection for ${e.friendlyName}"
                              @click=${t=>this._clearSelection(t,e.entityId)}
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
                        aria-label="${e.visible?"Hide":"Show"} ${e.friendlyName}"
                        aria-pressed=${!e.visible}
                        @click=${t=>this._toggle(t,e.entityId)}
                        @keydown=${t=>this._onToggleKeyDown(t,e.entityId)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          ${e.visible?q`
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              `:q`
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
                            aria-label="Remove ${e.friendlyName}"
                            title="Remove ${e.friendlyName}"
                            ?disabled=${this.managing}
                            @click=${t=>this._startRemove(t,e.entityId)}
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
                    </div>
                  `}
              ${this.canManage?q`
                    <div class="manage-toggle-row">
                      <button
                        type="button"
                        class="manage-toggle-btn ${this.manageMode?"active":"remove-mode"}"
                        aria-pressed=${this.manageMode?"true":"false"}
                        ?disabled=${this.managing}
                        @click=${this._onManageToggleClick}
                      >
                        ${this.manageMode?"Done":q`
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
                              Remove
                            `}
                      </button>
                    </div>
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
    `}_onManageToggleClick(){this.dispatchEvent(new CustomEvent("manage-toggle",{detail:{manageMode:!this.manageMode},bubbles:!0,composed:!0}))}_startDeleteGroup(){this.canManage&&!this.managing&&(this._cancelAdd(),this._confirmingRemove=null,this._confirmingDeleteGroup=!0)}_cancelDeleteGroup(){this._confirmingDeleteGroup=!1}_confirmDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("delete-group",{bubbles:!0,composed:!0})))}}he.styles=a`
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
    }
    .legend-panel.large-group {
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
      padding: 8px 10px;
      border-radius: 0;
      border-top: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      transition:
        background 0.15s ease,
        opacity 0.2s ease;
      font-size: var(--text-md, 13px);
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      position: relative;
      min-height: 42px;
      box-sizing: border-box;
    }
    .legend-panel.large-group .legend-item {
      min-height: 38px;
      padding-top: 7px;
      padding-bottom: 7px;
    }
    .row-select-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
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
      opacity: 0.35;
      transition: opacity 0.15s ease;
      padding: 14px;
      box-sizing: content-box;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: inherit;
      border-radius: 4px;
    }
    .eye-btn svg {
      width: 16px;
      height: 16px;
      display: block;
    }
    .legend-item:hover .eye-btn,
    .legend-item.hidden .eye-btn {
      opacity: 0.7;
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
      flex: 1;
      min-width: 0;
      gap: 1px;
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
      font-size: 10px;
      font-weight: 400;
      color: var(--secondary-text-color, #757575);
      opacity: 0.68;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      max-height: 16px;
      transition:
        max-height 0.15s ease,
        opacity 0.15s ease;
    }
    .legend-item:not(.selected):not(.manage-mode):not(:hover):not(:focus-within) .entity-id {
      max-height: 0;
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
    }
    .manage-toggle-row {
      padding: 4px 10px 8px;
      display: flex;
      justify-content: flex-end;
    }
    .manage-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 4px 12px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color, #616161);
      background: transparent;
      border: 1px solid var(--divider);
      border-radius: 6px;
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
    .manage-toggle-btn.remove-mode {
      border-color: var(--error-color, #db4437);
      color: var(--error-color, #db4437);
      background: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    }
    .manage-toggle-btn.remove-mode:hover:not(:disabled) {
      border-color: var(--error-color, #db4437);
      color: var(--error-color, #db4437);
      background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
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
      width: 100%;
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
      grid-template-columns: 1fr 1fr;
      gap: 6px;
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
      flex-shrink: 0;
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
    @media ${ae} {
      .preset-grid {
        grid-template-columns: 1fr;
      }
      .legend-item {
        padding: 10px 10px;
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
  `,he._shapes=Ht,t([ut({type:Array})],he.prototype,"curves",void 0),t([ut({type:String})],he.prototype,"selectedCurveId",void 0),t([ut({type:Number})],he.prototype,"scrubberPosition",void 0),t([ut({type:Boolean})],he.prototype,"canManage",void 0),t([ut({type:Boolean})],he.prototype,"managing",void 0),t([ut({type:Boolean})],he.prototype,"manageMode",void 0),t([ut({type:Number})],he.prototype,"closeRemoveSignal",void 0),t([ut({type:Number})],he.prototype,"closeAddSignal",void 0),t([ut({type:String})],he.prototype,"groupEntityId",void 0),t([ut({attribute:!1})],he.prototype,"hass",void 0),t([vt()],he.prototype,"_confirmingRemove",void 0),t([vt()],he.prototype,"_confirmingDeleteGroup",void 0),t([vt()],he.prototype,"_addingLight",void 0),t([vt()],he.prototype,"_pendingAddEntity",void 0),t([vt()],he.prototype,"_pendingPreset",void 0),bt("curve-legend",he);class pe extends ct{constructor(){super(...arguments),this.dirty=!1,this.readOnly=!1,this.saving=!1,this.canUndo=!1,this.previewActive=!1}_onSave(){this.dispatchEvent(new CustomEvent("save-curves",{bubbles:!0,composed:!0}))}_onCancel(){this.dispatchEvent(new CustomEvent("cancel-curves",{bubbles:!0,composed:!0}))}_onUndo(){this.dispatchEvent(new CustomEvent("undo-curves",{bubbles:!0,composed:!0}))}render(){return this.readOnly?q`
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
          ${this.saving?Jt.saving:this.previewActive?Jt.savePreview:Jt.save}
        </button>
      </div>
    `:q``}}pe.styles=a`
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
    @media ${ae} {
      .footer {
        min-height: 48px;
      }
      button {
        padding: 12px 20px;
        font-size: 14px;
        min-height: 44px;
      }
    }
  `,t([ut({type:Boolean})],pe.prototype,"dirty",void 0),t([ut({type:Boolean})],pe.prototype,"readOnly",void 0),t([ut({type:Boolean})],pe.prototype,"saving",void 0),t([ut({type:Boolean})],pe.prototype,"canUndo",void 0),t([ut({type:Boolean})],pe.prototype,"previewActive",void 0),bt("curve-footer",pe);"undefined"!=typeof window&&(window.__LIGHTENER_CURVE_CARD_VERSION__="2.16.0",function(t,e){if(void 0===t.customCards&&(t.customCards=[]),!Array.isArray(t.customCards))return;const i=t.customCards;i.some(t=>t?.type===e.type)||i.push(e)}(window,{type:_t,name:"Lightener Studio",description:"Shape how each light responds to group brightness.",documentationURL:"https://github.com/florianhorner/lightener-studio#readme",preview:!0,getEntitySuggestion:function(t,e){return mt(t,e)?{config:{type:ft,entity:e}}:null}}));const ge=q`<svg
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
</svg>`;const ue=["light"];class ve extends ct{constructor(){super(...arguments),this._config={},this._hass=null,this._picker=new yt(()=>this.isConnected,()=>this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._picker.ensureLoaded()}setConfig(t){this._config=t,this._picker.ensureLoaded()}set hass(t){this._hass=t,this._picker.ensureLoaded()}_fireConfigChanged(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_onEntityChange(t){const e=t.detail?.value??"";this._config={...this._config,entity:e||void 0},this._fireConfigChanged()}_onTitleChange(t){const e=t.target.value;this._config={...this._config,title:e||void 0},this._fireConfigChanged()}_onFallbackEntityInput(t){const e=t.target.value.trim();this._config={...this._config,entity:e||void 0},this._fireConfigChanged()}render(){const t=this._config.entity??"",e=this._config.title??"",i=this._hass?function(t){const e=t.entities;return e?Object.keys(e).filter(e=>mt(t,e)):[]}(this._hass):[];return q`
      <div class="form">
        <div class="field">
          <label>Entity</label>
          ${te({ready:this._picker.ready,hass:this._hass,value:t,includeDomains:ue,includeEntities:i.length?i:void 0,placeholder:"light.your_lightener_group",fallbackEvent:"change",onValueChanged:this._onEntityChange,onFallbackInput:this._onFallbackEntityInput})}
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
    `}}ve.styles=a`
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
  `,t([vt()],ve.prototype,"_config",void 0),t([vt()],ve.prototype,"_hass",void 0),bt("lightener-curve-card-editor",ve);class _e extends ct{constructor(){super(...arguments),this._curves=[],this._originalCurves=[],this._config={},this._selectedCurveId=null,this._saveState=ie,this._load=ne,this._manageError=null,this._managingLights=!1,this._groupDeleted=!1,this._scrubberPosition=null,this._cancelAnimating=!1,this._hass=null,this._undoStack=[],this._dragUndoPushed=!1,this._dragActive=!1,this._autoPresetsShownFor=new Set,this._boundKeyHandler=null,this._boundBeforeUnload=null,this._saveGuard=new re({dispatchSave:t=>this._dispatchSave(t),getSavePhase:()=>this._saveState.phase}),this._cancelAnimFrame=null,this._previewActive=!1,this._showPresets=!1,this._legendCloseRemoveSignal=0,this._legendCloseAddSignal=0,this._manageMode=!1,this._previewController=new jt({getHass:()=>this._hass,getCurves:()=>this._curves,getScrubberPosition:()=>this._scrubberPosition,setScrubberPosition:t=>{this._scrubberPosition=t},getStorageEntityId:()=>this._storageEntityId,persistScrubberPosition:(t,e)=>{this._writeStoredState(t,{scrubberPosition:e})},setPreviewActive:t=>{this._previewActive=t}}),this._lastEmittedDirtyState=!1,this._dirtyVersion=0,this._cleanVersion=0,this._onPreviewToggle=()=>{this._previewActive?this._stopPreview():this._startPreview()},this._startPreview=()=>{this._previewController.start()},this._stopPreview=()=>{this._previewController.stop()}}get _saving(){return"saving"===(t=this._saveState).phase||"confirming"===t.phase;var t}get _saveSuccess(){return"saved"===this._saveState.phase}get _saveError(){return"error"===(t=this._saveState).phase?t.message:null;var t}_dispatchSave(t){const e="confirming"===this._saveState.phase;this._saveState=function(t,e){switch(e.type){case"reset":return{phase:"idle"};case"dirty":return"idle"===t.phase?{phase:"dirty"}:t;case"save-start":return"saving"===t.phase||"confirming"===t.phase?t:{phase:"saving"};case"save-success":return"saving"!==t.phase?t:{phase:"confirming"};case"save-confirmed":return"confirming"!==t.phase?t:{phase:"saved"};case"save-error":return"saving"!==t.phase&&"confirming"!==t.phase?t:{phase:"error",message:e.message};case"save-clear":return"saved"===t.phase||"error"===t.phase?{phase:"idle"}:t}}(this._saveState,t),"confirming"!==this._saveState.phase&&this._saveGuard.onLeaveConfirming(this._saveState.phase,e)}get _lastPreviewTime(){return this._previewController.lastPreviewTime}set _lastPreviewTime(t){this._previewController.lastPreviewTime=t}get _embedded(){return!0===this._config.embedded}static getConfigElement(){return document.createElement("lightener-curve-card-editor")}static getStubConfig(){return{type:ft}}setConfig(t){const e=t.entity!==this._config.entity;this._config=t,e&&(this._previewActive&&this._stopPreview(),this._dragActive=!1,this._load=function(t){return{...t,loaded:!1,loadedEntityId:void 0,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._groupDeleted=!1,this._showPresets=!1,this._selectedCurveId=null,this._scrubberPosition=null,this._undoStack=[],this._cleanVersion=this._dirtyVersion,this._tryLoadCurves())}set hass(t){const e=!!this._hass;this._hass=t,e&&this._load.loaded||this._dragActive||this._tryLoadCurves()}getCardSize(){return 4}getGridOptions(){return{columns:12,rows:9,min_columns:6,min_rows:6}}get _isAdmin(){return this._hass?.user?.is_admin??!1}get _entityId(){return this._config.entity}get _storageEntityId(){return this._load.loadedEntityId??this._entityId}get _isDirty(){return this._dirtyVersion!==this._cleanVersion}get _canManageLights(){return this._isAdmin&&!!this._hass&&!!this._entityId&&!this._isDirty&&!this._saving&&!this._cancelAnimating&&!this._load.loading&&!this._managingLights&&!this._load.loadError&&!this._groupDeleted}get dirty(){return this._isDirty}connectedCallback(){super.connectedCallback(),this._load.loadErrorEntityId!==this._entityId&&(this._load=se(this._load)),this._groupDeleted&&this._load.loadedEntityId!==this._entityId&&(this._groupDeleted=!1,this._load=se(this._load)),this._tryLoadCurves(),this._boundKeyHandler=this._onKeyDown.bind(this),this._boundBeforeUnload=this._onBeforeUnload.bind(this),window.addEventListener("keydown",this._boundKeyHandler),window.addEventListener("beforeunload",this._boundBeforeUnload)}disconnectedCallback(){super.disconnectedCallback(),this._previewActive&&this._stopPreview(),this._previewController.disconnect(),this._dragActive=!1,this._boundKeyHandler&&window.removeEventListener("keydown",this._boundKeyHandler),this._boundBeforeUnload&&window.removeEventListener("beforeunload",this._boundBeforeUnload),"confirming"===this._saveState.phase&&(this._saveGuard.settleError(),this._load={...this._load,loading:!1,loaded:!1,reloadAfterLoadEntityId:void 0},this._dispatchSave({type:"reset"})),this._saveGuard.dispose(),this._cancelAnimFrame&&(cancelAnimationFrame(this._cancelAnimFrame),this._cancelAnimFrame=null,this._cancelAnimating=!1)}updated(t){if(super.updated(t),t.has("_curves")||t.has("_originalCurves")||t.has("_cancelAnimating")){const t=this._isDirty;t!==this._lastEmittedDirtyState&&(this._lastEmittedDirtyState=t,this.dispatchEvent(new CustomEvent("curve-dirty-state",{detail:{dirty:t},bubbles:!0,composed:!0})),t&&this._dispatchSave({type:"dirty"}))}}_togglePresets(){if(this._managingLights)return;if(0===this._curves.length)return;const t=!this._showPresets;this._showPresets=t,t&&(this._legendCloseAddSignal++,this._legendCloseRemoveSignal++)}_onLegendRemovePanelOpen(){this._showPresets=!1}_applyPreset(t){this._cancelAnimating||this._saving||this._managingLights||0!==this._curves.length&&(this._showPresets=!1,this._commitCurveEdit(function(t,e,i){const r=()=>i.map(t=>({...t}));return null!==e?t.map(t=>t.entityId===e?{...t,controlPoints:r()}:t):t.map(t=>({...t,controlPoints:r()}))}(this._curves,this._selectedCurveId,t.controlPoints)))}_renderPresetsPanel(){const t=null!==this._selectedCurveId?`Applying to ${this._curves.find(t=>t.entityId===this._selectedCurveId)?.friendlyName??"selected light"}`:"Applying to all lights";return q`
      <div class="presets-panel" role="region" aria-label=${Yt.panelAria}>
        <div class="presets-header">${t}</div>
        ${Gt.map(t=>q`
            <button class="preset-option" @click=${()=>this._applyPreset(t)}>
              ${ee(t)}
              <div class="preset-name">${t.name}</div>
              <div class="preset-desc">${t.description}</div>
            </button>
          `)}
      </div>
    `}_storedStateKey(t){return`lightener:curve-card:v1:${t}`}_readStoredState(t){try{const e=sessionStorage.getItem(this._storedStateKey(t));if(!e)return null;const i=JSON.parse(e),r="string"==typeof i.selectedCurveId||null===i.selectedCurveId?i.selectedCurveId:null;let n=null;return"number"==typeof i.scrubberPosition&&isFinite(i.scrubberPosition)&&(n=Math.min(100,Math.max(0,i.scrubberPosition))),{selectedCurveId:r,scrubberPosition:n}}catch{return null}}_writeStoredState(t,e){try{const i={...this._readStoredState(t)??{selectedCurveId:null,scrubberPosition:null},...e};sessionStorage.setItem(this._storedStateKey(t),JSON.stringify(i))}catch{}}_onKeyDown(t){var e,i;(e=document.activeElement,i=this,!e||e===i||e===document.body||i.contains(e))&&((t.ctrlKey||t.metaKey)&&"s"===t.key&&this._isDirty&&this._isAdmin&&!this._saving&&!this._managingLights&&(t.preventDefault(),this._onSave()),!t.ctrlKey&&!t.metaKey||"z"!==t.key||t.shiftKey||!this._saving&&!this._cancelAnimating&&!this._managingLights&&this._undoStack.length>0&&(t.preventDefault(),this._undo()),"Escape"===t.key&&(this._showPresets?(t.preventDefault(),this._showPresets=!1):!this._isDirty||this._saving||this._cancelAnimating||this._managingLights||(t.preventDefault(),this._onCancel())))}_onBeforeUnload(t){this._isDirty&&(t.preventDefault(),t.returnValue="")}async _tryLoadCurves(){const t=this._saveGuard.currentGeneration();if(!function(t,e){return!(t.loaded&&t.loadedEntityId===e||t.loading)}(this._load,this._entityId))return;if(!this._hass||!this._entityId){if(0===this._curves.length){const t=[{entityId:"light.ceiling_light",friendlyName:"Ceiling Light",controlPoints:[{lightener:0,target:0},{lightener:20,target:0},{lightener:60,target:80},{lightener:100,target:100}],visible:!0,color:Nt[0]},{entityId:"light.sofa_lamp",friendlyName:"Sofa Lamp",controlPoints:[{lightener:0,target:0},{lightener:10,target:50},{lightener:40,target:100},{lightener:70,target:100},{lightener:100,target:60}],visible:!0,color:Nt[1]},{entityId:"light.led_strip",friendlyName:"LED Strip",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}],visible:!0,color:Nt[2]}];this._curves=t,this._originalCurves=$t(t),this._cleanVersion=this._dirtyVersion}return}this._load=function(t){return{...t,loadError:null,loading:!0}}(this._load);const e=this._entityId;try{const o=await this._hass.callWS({type:"lightener/get_curves",entity_id:e}),{state:s,action:a}=function(t,e,i,r){return i!==e?{state:t,action:"discard"}:t.reloadAfterLoadEntityId===e?{state:t,action:"run-queued-reload"}:r?{state:{...t,pendingReloadEntityId:e,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"defer-dirty"}:{state:{...t,pendingReloadEntityId:void 0,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"apply"}}(this._load,e,this._entityId,this._isDirty);let l;if("apply"!==a&&"defer-dirty"!==a||(i=o.entities,r=this._hass.states,n=Nt,l=Object.keys(i).map((t,e)=>{const o=i[t]?.brightness??{},s=new Map([[0,0]]);for(const[t,e]of Object.entries(o)){const i=Number(t),r=Number(e);Number.isFinite(i)&&Number.isFinite(r)&&(i<0||i>100||r<0||r>100||s.set(i,r))}const a=[...s].map(([t,e])=>({lightener:t,target:e}));a.sort((t,e)=>t.lightener-e.lightener);const l=r[t]?.attributes?.friendly_name??t.replace("light.","");return{entityId:t,friendlyName:l,controlPoints:a,visible:!0,color:n[e%n.length]}})),this._load=s,"apply"===a||"defer-dirty"===a){if("apply"===a&&l){if(this._curves=l,this._originalCurves=$t(l),this._cleanVersion=this._dirtyVersion,null===this._selectedCurveId&&null===this._scrubberPosition){const t=this._readStoredState(e);t&&(null!==t.selectedCurveId&&wt(this._curves,t.selectedCurveId)&&(this._selectedCurveId=t.selectedCurveId),null!==t.scrubberPosition&&(this._scrubberPosition=t.scrubberPosition))}qt(this._autoPresetsShownFor,e,l)&&(this._showPresets=!0),this._saveGuard.confirm(t)}this._autoPresetsShownFor.add(e)}}catch(i){const{state:r,discarded:n}=function(t,e,i,r){return i!==e?{state:t,discarded:!0}:{state:{...t,loadError:r,loaded:!0,loadedEntityId:e,loadErrorEntityId:e},discarded:!1}}(this._load,e,this._entityId,String(i));this._load=r,n||(console.error("[Lightener] Failed to load curves:",i),this._saveGuard.fail(t,"Save failed. Check connection."))}finally{const{state:t,followUp:i}=function(t,e,i){const r={...t,loading:!1};return i!==e?{state:r,followUp:"reload-changed-entity"}:t.reloadAfterLoadEntityId===e?{state:{...r,reloadAfterLoadEntityId:void 0,loaded:!1},followUp:"run-queued-reload"}:{state:r,followUp:"none"}}(this._load,e,this._entityId);this._load=t,"none"!==i&&this._tryLoadCurves()}var i,r,n}_onScrubberMove(t){const e=t.detail.position;this._scrubberPosition=e,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{scrubberPosition:e}),this._previewActive&&this._previewLights(e)}_onScrubberStart(){}_onScrubberEnd(){}_refreshActivePreview(t=!1){this._previewController.refresh(t)}_previewLights(t,e=!1){this._previewController.previewLights(t,e)}_previewSingleLight(t,e,i=!1,r){this._previewController.previewSingleLight(t,e,i,r)}_onSelectCurve(t){if(this._cancelAnimating)return;const{entityId:e}=t.detail;(e===this._selectedCurveId||wt(this._curves,e))&&(this._selectedCurveId=function(t,e){return t===e?null:e}(this._selectedCurveId,e),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}),this._refreshActivePreview(!0))}_onFocusCurve(t){if(this._cancelAnimating)return;const{entityId:e}=t.detail;wt(this._curves,e)&&(this._selectedCurveId=e,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}),this._refreshActivePreview(!0))}_pushUndo(){kt(this._undoStack,this._curves)}_commitCurveEdit(t){this._pushUndo(),this._curves=t,this._dirtyVersion++,this._refreshActivePreview(!0)}_completeDragMaybeReload(){this._dragUndoPushed=!1,this._dragActive=!1,!this._load.loaded&&this._hass&&this._tryLoadCurves()}_undo(){0!==this._undoStack.length&&null===this._cancelAnimFrame&&this._animateCurvesTo(this._undoStack.pop(),()=>{this._refreshActivePreview(!0)})}_animateCurvesTo(t,e){const i=$t(this._curves);this._cancelAnimating=!0;const r=performance.now(),n=o=>{const s=o-r,a=Math.min(s/300,1),l=function(t){return 1-Math.pow(1-t,3)}(a),d=t.map((t,e)=>{const r=i[e];if(!r)return t;const n=r.controlPoints,o=t.controlPoints,s=function(t,e,i){const r=Math.min(t.length,e.length),n=[];for(let o=0;o<r;o++)n.push({lightener:Math.round(t[o].lightener+(e[o].lightener-t[o].lightener)*i),target:Math.round(t[o].target+(e[o].target-t[o].target)*i)});return n}(n,o,l);if(o.length>s.length&&a>=1)for(let t=s.length;t<o.length;t++)s.push({...o[t]});if(n.length>s.length&&a<1)for(let t=s.length;t<n.length;t++)s.push({...n[t]});return s.sort((t,e)=>t.lightener-e.lightener),{...t,controlPoints:s,visible:r.visible}});if(this._curves=d,a<1)this._cancelAnimFrame=requestAnimationFrame(n);else{this._curves=function(t,e){return e.map((e,i)=>({...e,visible:t[i]?.visible??e.visible}))}(i,t),this._cancelAnimating=!1,this._cancelAnimFrame=null;const r=function(t,e){if(t.length!==e.length)return!1;for(let i=0;i<t.length;i++){const r=t[i].controlPoints,n=e[i].controlPoints;if(r.length!==n.length)return!1;for(let t=0;t<r.length;t++){if(r[t].lightener!==n[t].lightener)return!1;if(r[t].target!==n[t].target)return!1}}return!0}(this._curves,this._originalCurves);r&&(this._cleanVersion=this._dirtyVersion),e?.(),r&&this._reloadPendingDirtyResponse()}};this._cancelAnimFrame=requestAnimationFrame(n)}_onPointMove(t){if(this._cancelAnimating)return;const{curveIndex:e,pointIndex:i,lightener:r,target:n}=t.detail,o=function(t,e,i,r,n){const o=[...t],s=o[e];if(!s||!s.controlPoints[i])return null;const a={...s},l=[...a.controlPoints];return l[i]={lightener:r,target:n},a.controlPoints=l,o[e]=a,o}(this._curves,e,i,r,n);if(null===o)return;this._dragActive=!0,this._showPresets=!1,this._dragUndoPushed||(this._pushUndo(),this._dragUndoPushed=!0);const s=this._curves[e];s&&this._selectedCurveId!==s.entityId&&(this._selectedCurveId=s.entityId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId})),this._curves=o,this._dirtyVersion++,s?this._previewSingleLight(s.entityId,r,!1,n):this._refreshActivePreview()}_onPointDrop(t){this._completeDragMaybeReload()}_onPointAdd(t){if(this._cancelAnimating)return;const{lightener:e,target:i,entityId:r}=t.detail,n=r??this._selectedCurveId;if(!n)return;const o=function(t,e,i,r){return function(t,e,i,r){const n=t.findIndex(t=>t.entityId===e);if(n<0)return null;if(t[n].controlPoints.some(t=>t.lightener===i))return null;const o=[...t],s={...o[n]};return s.controlPoints=[...s.controlPoints,{lightener:i,target:r}].sort((t,e)=>t.lightener-e.lightener),o[n]=s,o}(t,e,i,r)}(this._curves,n,e,i);null!==o&&this._commitCurveEdit(o)}_onPointRemove(t){if(this._cancelAnimating)return;this._completeDragMaybeReload();const{curveIndex:e,pointIndex:i}=t.detail,r=Ct(this._curves,e,i);null!==r&&this._commitCurveEdit(r)}_onToggleCurve(t){if(this._cancelAnimating)return;const{entityId:e}=t.detail,i=this._selectedCurveId,r=function(t,e,i){const r=function(t,e){return t.map(t=>t.entityId===e?{...t,visible:!t.visible}:t)}(t,i);let n=e;if(e===i){const t=r.find(t=>t.entityId===i);t&&!t.visible&&(n=null)}return{curves:r,selectedCurveId:n}}(this._curves,this._selectedCurveId,e);this._curves=r.curves,r.selectedCurveId!==i&&(this._selectedCurveId=r.selectedCurveId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onManageToggle(t){const e=t.detail,i=e&&"boolean"==typeof e.manageMode?e.manageMode:!this._manageMode;this._manageMode=i,i||this._legendCloseRemoveSignal++}async _onDeleteGroup(){if(!this._hass||!this._entityId||this._managingLights)return;this._previewActive&&this._stopPreview();const t=this._entityId;this._manageError=null,this._managingLights=!0;try{const e=await this._hass.callWS({type:"config/entity_registry/get",entity_id:t});if("lightener"!==e?.platform)throw new Error("Entity is not a Lightener group — cannot delete from this card.");const i=e?.config_entry_id;if(!i)throw new Error("Group is not backed by a config entry — cannot delete from the card.");await this._hass.callApi("DELETE",`config/config_entries/entry/${i}`),this._manageMode=!1,this._legendCloseRemoveSignal++,this._curves=[],this._originalCurves=[],this._undoStack=[],this._load={...this._load,loaded:!0,loadedEntityId:t,loadError:null,loadErrorEntityId:void 0},this._selectedCurveId=null,this._writeStoredState(t,{selectedCurveId:null}),this._groupDeleted=!0,this.dispatchEvent(new CustomEvent("lightener-group-deleted",{detail:{entityId:t,configEntryId:i},bubbles:!0,composed:!0}))}catch(t){console.error("[Lightener] Failed to delete group:",t),this._manageError=this._formatManageError(t,"Could not delete group.")}finally{this._managingLights=!1}}async _onRemoveLight(t){if(!this._hass||!this._entityId||this._managingLights)return;const{entityId:e}=t.detail;if(e){this._previewActive&&this._stopPreview(),this._manageError=null,this._managingLights=!0;try{await this._hass.callWS({type:"lightener/remove_light",entity_id:this._entityId,controlled_entity_id:e}),this._selectedCurveId===e&&(this._selectedCurveId=null,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:null})),this._undoStack=[],this._load=se(this._load),await this._tryLoadCurves()}catch(t){console.error("[Lightener] Failed to remove light:",t),this._manageError=this._formatManageError(t,"Could not remove light.")}finally{this._managingLights=!1}}}async _onAddLight(t){if(!this._hass||!this._entityId||this._managingLights)return;const{entityId:e,preset:i}=t.detail;if(e){this._previewActive&&this._stopPreview(),this._manageError=null,this._managingLights=!0;try{const t={type:"lightener/add_light",entity_id:this._entityId,controlled_entity_id:e};i&&(t.preset=i),await this._hass.callWS(t),this._undoStack=[],this._load=se(this._load),await this._tryLoadCurves(),this._legendCloseAddSignal++}catch(t){console.error("[Lightener] Failed to add light:",t),this._manageError=this._formatManageError(t,"Could not add light.")}finally{this._managingLights=!1}}}_onLegendAddPanelOpen(){this._showPresets=!1}_formatManageError(t,e){const i=t;return i?.message?i.message:e}async saveCurves(){return this._onSave()}async _onSave(){if(!this._hass||!this._entityId||this._saving||this._cancelAnimating||this._managingLights)return!1;this._previewActive&&this._stopPreview();const t=this._entityId;this._dispatchSave({type:"save-start"});try{const e=function(t){const e={};for(const i of t){const t={};let r=-1,n=0;for(const e of i.controlPoints)Number.isFinite(e.lightener)&&Number.isFinite(e.target)&&(e.lightener<0||e.lightener>100||e.target<0||e.target>100||0===e.lightener&&0===e.target||(t[String(e.lightener)]=String(e.target),e.lightener>r&&(r=e.lightener,n=e.target)));!("100"in t)&&r>=0&&(t[100]=String(n)),e[i.entityId]={brightness:t}}return e}(this._curves);if(await this._hass.callWS({type:"lightener/save_curves",entity_id:t,curves:e}),this._entityId!==t)return this._previewActive&&this._stopPreview(),this._undoStack=[],this._dispatchSave({type:"reset"}),!1;this._cleanVersion=this._dirtyVersion,this._undoStack=[],this._load={...this._load,pendingReloadEntityId:void 0},this._dispatchSave({type:"save-success"});const{settled:i}=this._saveGuard.arm(),{state:r,runNow:n}=oe(this._load,t);return this._load=r,n&&this._tryLoadCurves(),"confirmed"===await i}catch(t){return console.error("[Lightener] Failed to save curves:",t),this._dispatchSave({type:"save-error",message:"Save failed. Check connection."}),!1}}_retryLoad(){this._load=function(t){return{...t,loaded:!1,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._tryLoadCurves()}_reloadCurvesAfterCurrentLoad(t){const{state:e,runNow:i}=oe(this._load,t);this._load=e,i&&this._tryLoadCurves()}_reloadPendingDirtyResponse(){const{state:t,reloadEntityId:e}=function(t,e){const i=t.pendingReloadEntityId;return i&&i===e?{state:{...t,pendingReloadEntityId:void 0},reloadEntityId:i}:{state:t}}(this._load,this._entityId);this._load=t,e&&this._reloadCurvesAfterCurrentLoad(e)}_onCancel(){this._cancelAnimating||(this._previewActive&&this._stopPreview(),this._showPresets=!1,this._undoStack=[],this._animateCurvesTo($t(this._originalCurves),()=>{this._selectedCurveId=null,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:null}),this._dispatchSave({type:"reset"})}))}_renderLoadingSkeleton(){return q`
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-graph" aria-hidden="true"></div>
        <div class="loading-caption">Loading brightness shapes…</div>
      </div>
    `}_renderGraphInsight(){const t=Wt(this._curves,this._selectedCurveId);return t?q`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${t.primary}>${t.primary}</span>
        <span class="graph-insight-secondary" title=${t.secondary}>${t.secondary}</span>
      </div>
    `:W}render(){return q`
      <div
        class="card ${this._embedded?"embedded":""}"
        role="region"
        aria-label="Brightness editor"
      >
        <div class="header">
          <h2>${this._config.title??"Brightness shapes"}</h2>
          ${!this._load.loading&&this._isAdmin&&this._curves.length>0?q`<button
                class="presets-btn ${this._showPresets?"active":""}"
                @click=${this._togglePresets}
                ?disabled=${this._managingLights}
                aria-expanded=${this._showPresets}
              >
                Presets
              </button>`:W}
        </div>

        <div class="workspace">
          <div class="main-stack">
            ${this._load.loading?this._renderLoadingSkeleton():q`<div class="graph-panel">
                  ${this._renderGraphInsight()}
                  <curve-graph
                    .curves=${this._curves}
                    .selectedCurveId=${this._selectedCurveId}
                    .entityId=${this._entityId??null}
                    .readOnly=${!this._isAdmin||this._cancelAnimating||this._managingLights}
                    .scrubberPosition=${this._scrubberPosition}
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
                  .position=${this._scrubberPosition}
                  @scrubber-move=${this._onScrubberMove}
                  @scrubber-start=${this._onScrubberStart}
                  @scrubber-end=${this._onScrubberEnd}
                  @preview-toggle=${this._onPreviewToggle}
                ></curve-scrubber>`:W}
          </div>

          <aside class="side-rail" aria-label="Room lights and shapes">
            ${this._showPresets?this._renderPresetsPanel():W}
            <curve-legend
              .curves=${this._curves}
              .selectedCurveId=${this._selectedCurveId}
              .scrubberPosition=${this._scrubberPosition}
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
            ${this._manageError?q`<div class="error" role="alert">${ge} ${this._manageError}</div>`:W}
          </aside>

          <div class="footer-slot">
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
                ${ge} Failed to load curves
                <button type="button" class="retry-link" @click=${this._retryLoad}>Retry</button>
              </div>`:W}
          ${this._groupDeleted?q`<div class="error" role="status">
                ${ge} This Lightener group was deleted. Remove this card or point it at a
                different group.
              </div>`:W}
          ${this._saveError?q`<div class="error" role="alert">
                ${ge} Save failed
                <button type="button" class="retry-link" @click=${this._onSave}>Retry</button>
              </div>`:W}
        </div>
      </div>
    `}}_e.styles=a`
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

      display: block;
      font-family: var(
        --mdc-typography-body1-font-family,
        var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)
      );
      height: fit-content;
    }
    .card {
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
    }
    .graph-insight-primary {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.25;
    }
    .graph-insight-secondary {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--secondary-text);
      font-size: 11px;
      line-height: 1.25;
      text-align: right;
    }
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
      min-height: 280px;
      gap: 16px;
      padding: 28px 20px;
      border-radius: 12px;
      background: var(--panel-bg);
    }
    .loading-graph {
      position: relative;
      min-height: 240px;
      border-radius: 10px;
      overflow: hidden;
      background:
        linear-gradient(
          90deg,
          transparent,
          var(--divider-color, rgba(127, 127, 127, 0.15)),
          transparent
        ),
        linear-gradient(rgba(128, 128, 128, 0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(128, 128, 128, 0.08) 1px, transparent 1px);
      background-size:
        200px 100%,
        100% 25%,
        25% 100%;
      background-position:
        -200px 0,
        0 0,
        0 0;
      animation: shimmer 1.8s ease-in-out infinite;
    }
    .loading-graph::before,
    .loading-graph::after {
      content: '';
      position: absolute;
    }
    .loading-graph::before {
      inset: 18px 18px 18px 28px;
      border-left: 1px solid rgba(128, 128, 128, 0.18);
      border-bottom: 1px solid rgba(128, 128, 128, 0.18);
      border-radius: 0 0 0 6px;
    }
    .loading-graph::after {
      inset: auto 40px 52px 44px;
      height: 90px;
      border-radius: 999px;
      background: linear-gradient(
        120deg,
        color-mix(in srgb, var(--accent) 8%, transparent) 0%,
        color-mix(in srgb, var(--accent) 30%, transparent) 45%,
        color-mix(in srgb, var(--accent) 8%, transparent) 100%
      );
      clip-path: polygon(0% 78%, 18% 78%, 38% 45%, 62% 18%, 82% 22%, 100% 0, 100% 100%, 0 100%);
    }
    .loading-caption {
      font-size: var(--text-sm);
      color: var(--secondary-text);
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
          -200px 0,
          0 0,
          0 0;
      }
      100% {
        background-position:
          calc(100% + 200px) 0,
          0 0,
          0 0;
      }
    }
    @media (min-width: 1100px) {
      .card.embedded .workspace {
        grid-template-columns: minmax(0, 1.95fr) minmax(280px, 0.8fr);
        align-items: start;
        grid-template-areas:
          'main side'
          'main footer';
      }
      .card.embedded .main-stack {
        grid-area: main;
      }
      .card.embedded .side-rail {
        grid-area: side;
      }
      .card.embedded .footer-slot {
        grid-area: footer;
      }
    }
    @media (max-width: 1099px) {
      .card.embedded .footer-slot {
        order: 2;
        position: sticky;
        bottom: max(0px, env(safe-area-inset-bottom));
        z-index: 3;
        padding-top: 8px;
        border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
        background: color-mix(in srgb, var(--card-bg) 72%, transparent);
        backdrop-filter: blur(14px);
      }
      .card.embedded .side-rail {
        order: 3;
      }
      .graph-insight {
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
      }
      .graph-insight-secondary {
        text-align: left;
        white-space: normal;
      }
    }
    .presets-btn {
      margin-left: auto;
      padding: 4px 10px;
      min-height: 44px;
      font-size: 12px;
      font-weight: 500;
      background: transparent;
      border: 1px solid var(--divider);
      border-radius: 6px;
      color: var(--secondary-text);
      cursor: pointer;
      font-family: inherit;
      transition:
        border-color 0.15s ease,
        color 0.15s ease,
        background 0.15s ease;
      flex-shrink: 0;
    }
    .presets-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .presets-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .presets-btn.active {
      border-color: var(--accent);
      color: var(--accent);
    }
    .presets-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      border: 1px solid color-mix(in srgb, var(--divider) 70%, transparent);
      border-radius: 12px;
      padding: 10px;
      padding-bottom: 8px;
      animation: fade-in 0.15s ease;
    }
    .presets-header {
      grid-column: 1 / -1;
      font-size: 11px;
      color: var(--secondary-text);
      opacity: 0.7;
      padding-bottom: 2px;
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
    }
    .preset-option:hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 4%, transparent);
    }
    .preset-option:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .preset-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-color);
    }
    .preset-desc {
      font-size: 10px;
      color: var(--secondary-text);
      opacity: 0.75;
      line-height: 1.35;
    }
    .preset-thumb {
      display: block;
      opacity: 0.65;
      margin-bottom: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-graph {
        animation: none;
      }
    }
  `,t([vt()],_e.prototype,"_curves",void 0),t([vt()],_e.prototype,"_originalCurves",void 0),t([vt()],_e.prototype,"_config",void 0),t([vt()],_e.prototype,"_selectedCurveId",void 0),t([vt()],_e.prototype,"_saveState",void 0),t([vt()],_e.prototype,"_load",void 0),t([vt()],_e.prototype,"_manageError",void 0),t([vt()],_e.prototype,"_managingLights",void 0),t([vt()],_e.prototype,"_groupDeleted",void 0),t([vt()],_e.prototype,"_scrubberPosition",void 0),t([vt()],_e.prototype,"_cancelAnimating",void 0),t([vt()],_e.prototype,"_hass",void 0),t([vt()],_e.prototype,"_previewActive",void 0),t([vt()],_e.prototype,"_showPresets",void 0),t([vt()],_e.prototype,"_legendCloseRemoveSignal",void 0),t([vt()],_e.prototype,"_legendCloseAddSignal",void 0),t([vt()],_e.prototype,"_manageMode",void 0),bt(_t,_e);export{_e as LightenerCurveCard,ve as LightenerCurveCardEditor};
