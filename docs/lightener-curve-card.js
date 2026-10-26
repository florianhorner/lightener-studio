function t(t,e,i,s){var r,n=arguments.length,o=n<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(o=(n<3?r(o):n>3?r(e,i,o):r(e,i))||o);return n>3&&o&&Object.defineProperty(e,i,o),o}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),r=new WeakMap;let n=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&r.set(e,t))}return t}toString(){return this.cssText}};const o=t=>new n("string"==typeof t?t:t+"",void 0,s),a=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new n(i,t,s)},l=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return o(e)})(t):t,{is:h,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:_}=Object,v=globalThis,g=v.trustedTypes,m=g?g.emptyScript:"",f=v.reactiveElementPolyfillSupport,y=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},w=(t,e)=>!h(t,e),x={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:w};Symbol.metadata??=Symbol("metadata"),v.litPropertyMetadata??=new WeakMap;let I=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&d(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:r}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const n=s?.call(this);r?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const t=_(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const t=this.properties,e=[...p(t),...u(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),r=e.litNonce;void 0!==r&&s.setAttribute("nonce",r),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(e,i.type);this._$Em=t,null==r?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=s;const n=r.fromAttribute(e,t.type);this[s]=n??this._$Ej?.get(s)??n,this._$Em=null}}requestUpdate(t,e,i,s=!1,r){if(void 0!==t){const n=this.constructor;if(!1===s&&(r=this[t]),i??=n.getPropertyOptions(t),!((i.hasChanged??w)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:r},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==r||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};I.elementStyles=[],I.shadowRootOptions={mode:"open"},I[y("elementProperties")]=new Map,I[y("finalized")]=new Map,f?.({ReactiveElement:I}),(v.reactiveElementVersions??=[]).push("2.1.2");const $=globalThis,k=t=>t,C=$.trustedTypes,S=C?C.createPolicy("lit-html",{createHTML:t=>t}):void 0,E="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,T="?"+P,A=`<${T}>`,R=document,L=()=>R.createComment(""),M=t=>null===t||"object"!=typeof t&&"function"!=typeof t,D=Array.isArray,O="[ \t\n\f\r]",G=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,F=/-->/g,N=/>/g,U=RegExp(`>|${O}(?:([^\\s"'>=/]+)(${O}*=${O}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,B=/"/g,z=/^(?:script|style|textarea|title)$/i,V=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),q=V(1),j=V(2),W=Symbol.for("lit-noChange"),K=Symbol.for("lit-nothing"),Y=new WeakMap,J=R.createTreeWalker(R,129);function X(t,e){if(!D(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}class Z{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let r=0,n=0;const o=t.length-1,a=this.parts,[l,h]=((t,e)=>{const i=t.length-1,s=[];let r,n=2===e?"<svg>":3===e?"<math>":"",o=G;for(let e=0;e<i;e++){const i=t[e];let a,l,h=-1,d=0;for(;d<i.length&&(o.lastIndex=d,l=o.exec(i),null!==l);)d=o.lastIndex,o===G?"!--"===l[1]?o=F:void 0!==l[1]?o=N:void 0!==l[2]?(z.test(l[2])&&(r=RegExp("</"+l[2],"g")),o=U):void 0!==l[3]&&(o=U):o===U?">"===l[0]?(o=r??G,h=-1):void 0===l[1]?h=-2:(h=o.lastIndex-l[2].length,a=l[1],o=void 0===l[3]?U:'"'===l[3]?B:H):o===B||o===H?o=U:o===F||o===N?o=G:(o=U,r=void 0);const c=o===U&&t[e+1].startsWith("/>")?" ":"";n+=o===G?i+A:h>=0?(s.push(a),i.slice(0,h)+E+i.slice(h)+P+c):i+P+(-2===h?e:c)}return[X(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]})(t,e);if(this.el=Z.createElement(l,i),J.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=J.nextNode())&&a.length<o;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(E)){const e=h[n++],i=s.getAttribute(t).split(P),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:o[2],strings:i,ctor:"."===o[1]?st:"?"===o[1]?rt:"@"===o[1]?nt:it}),s.removeAttribute(t)}else t.startsWith(P)&&(a.push({type:6,index:r}),s.removeAttribute(t));if(z.test(s.tagName)){const t=s.textContent.split(P),e=t.length-1;if(e>0){s.textContent=C?C.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],L()),J.nextNode(),a.push({type:2,index:++r});s.append(t[e],L())}}}else if(8===s.nodeType)if(s.data===T)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=s.data.indexOf(P,t+1));)a.push({type:7,index:r}),t+=P.length-1}r++}}static createElement(t,e){const i=R.createElement("template");return i.innerHTML=t,i}}function Q(t,e,i=t,s){if(e===W)return e;let r=void 0!==s?i._$Co?.[s]:i._$Cl;const n=M(e)?void 0:e._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),void 0===n?r=void 0:(r=new n(t),r._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=r:i._$Cl=r),void 0!==r&&(e=Q(t,r._$AS(t,e.values),r,s)),e}class tt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??R).importNode(e,!0);J.currentNode=s;let r=J.nextNode(),n=0,o=0,a=i[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new et(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new ot(r,this,t)),this._$AV.push(e),a=i[++o]}n!==a?.index&&(r=J.nextNode(),n++)}return J.currentNode=R,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class et{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=K,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),M(t)?t===K||null==t||""===t?(this._$AH!==K&&this._$AR(),this._$AH=K):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>D(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==K&&M(this._$AH)?this._$AA.nextSibling.data=t:this.T(R.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Z.createElement(X(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new tt(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=Y.get(t.strings);return void 0===e&&Y.set(t.strings,e=new Z(t)),e}k(t){D(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const r of t)s===e.length?e.push(i=new et(this.O(L()),this.O(L()),this,this.options)):i=e[s],i._$AI(r),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=k(t).nextSibling;k(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class it{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,r){this.type=1,this._$AH=K,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=K}_$AI(t,e=this,i,s){const r=this.strings;let n=!1;if(void 0===r)t=Q(this,t,e,0),n=!M(t)||t!==this._$AH&&t!==W,n&&(this._$AH=t);else{const s=t;let o,a;for(t=r[0],o=0;o<r.length-1;o++)a=Q(this,s[i+o],e,o),a===W&&(a=this._$AH[o]),n||=!M(a)||a!==this._$AH[o],a===K?t=K:t!==K&&(t+=(a??"")+r[o+1]),this._$AH[o]=a}n&&!s&&this.j(t)}j(t){t===K?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class st extends it{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===K?void 0:t}}class rt extends it{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==K)}}class nt extends it{constructor(t,e,i,s,r){super(t,e,i,s,r),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??K)===W)return;const i=this._$AH,s=t===K&&i!==K||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==K&&(i===K||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const at={I:et},lt=$.litHtmlPolyfillSupport;lt?.(Z,et),($.litHtmlVersions??=[]).push("3.3.2");const ht=(t,e,i)=>{const s=i?.renderBefore??e;let r=s._$litPart$;if(void 0===r){const t=i?.renderBefore??null;s._$litPart$=r=new et(e.insertBefore(L(),t),t,void 0,i??{})}return r._$AI(t),r},dt=globalThis;let ct=class extends I{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=ht(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}};ct._$litElement$=!0,ct.finalized=!0,dt.litElementHydrateSupport?.({LitElement:ct});const pt=dt.litElementPolyfillSupport;pt?.({LitElement:ct}),(dt.litElementVersions??=[]).push("4.2.2");const ut={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:w},_t=(t=ut,e,i)=>{const{kind:s,metadata:r}=i;let n=globalThis.litPropertyMetadata.get(r);if(void 0===n&&globalThis.litPropertyMetadata.set(r,n=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const r=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,r,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const r=this[s];e.call(this,i),this.requestUpdate(s,r,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};function vt(t){return(e,i)=>"object"==typeof i?_t(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function gt(t){return vt({...t,state:!0,attribute:!1})}const mt={drafts:{savedChanged:"Saved state changed. Review again before continuing.",changedLights:"changed lights",changedLight:"changed light",unverified:"Check the latest saved shapes before continuing. Your local draft is unchanged.",unavailable:"Navigation recovery is unavailable until your signed-in identity and saved group are ready. Keep this editor open to preserve your draft.",notRetained:"Latest edits could not be retained for navigation. Keep this editor open; an older checkpoint may remain.",changed:"That draft changed or was opened elsewhere. Choose from the current drafts.",openedElsewhere:"This draft was opened elsewhere. This local copy cannot change lights or saved shapes.",reviewLocal:"Review local copy",unavailableSaved:"The latest saved group is unavailable for recovery. The retained draft is unchanged.",inconsistent:"This checkpoint does not match its saved baseline and cannot be recovered.",available:"Unsaved draft available:",older:"Older checkpoint only; latest edits were not retained:",recover:"Recover draft",discard:"Discard draft",unknown:"An earlier save has an unresolved outcome. Review saved shapes before saving."},saveReview:{title:"Review latest saved shapes",body:"Your draft stays unchanged until you choose. Continuing starts fresh Undo: Undo returns to the latest saved shapes. This review does not save or change any lights.",keep:"Keep my shape",saved:"Use saved shape",removed:"Removed from this group. Its local edit cannot be reapplied.",alreadySaved:"Your shape is already saved.",unchanged:"Your shape can be kept; the saved shape has not changed.",acknowledgeRemoved:"I understand edits to removed lights will be dropped.",back:"Back to draft",useSaved:"Use saved shapes",continue:"Continue editing"},guardedSave:{conflict:"Saved shapes changed. Review the latest saved shapes.",refresh:"Refresh this editor before saving. Your draft stays here until you leave.",notFound:"This group was removed. Your draft is still here.",rolledBack:"The save was rolled back. Check saved state before trying again.",runtime:"Saved shapes and lights may disagree. Recovery is required before editing further.",unauthorized:"You do not have permission to save these shapes.",unknownEntities:"A light is no longer in this group. Review the latest saved shapes.",invalid:"Save failed. Check the shape points before trying again.",uncertain:"Save outcome unknown. Check saved state before trying again.",readFailed:"Could not check saved shapes. Your draft is unchanged.",incompatibleRead:"The backend cannot provide a guarded saved state.",present:"Your edits are now present in the saved shapes.",readOnly:"Read-only: an administrator can save shapes for this group.",incompatible:"Update the backend and refresh before saving. Your draft stays here.",checking:"Checking saved shapes…",review:"Review latest",check:"Check saved state",invalidResponse:"Invalid saved shapes response"},invitation:{example:"Example shape",drag:"Drag this circle",dragPoint:"Drag this point",dismiss:"Dismiss example",replay:"Replay example shape",together:"Try the lights together",touchAdd:"Double-tap the shape to add a point",mouseAdd:"Double-click the shape to add a point",keyboardAdd:"Press Enter on a point to add another",description:"Example shape. Changing a point keeps this shape as an unsaved edit. Undo restores your previous shape.",values:"Example brightness values",forLight:t=>`Example shape for ${t}`,announcement:t=>`Example shape for ${t}. Use arrow keys on a point to edit. Undo restores your previous shape.`},canvasHelp:{open:"Show me how",close:"Close example",guidance:"Example on your canvas. Your shapes are unchanged. Grab a point to make it yours.",replay:"Replay",done:"Done",draft:"Save or cancel your draft before starting the canvas example. Your edits are unchanged.",watching:"Restore lights before starting the canvas example.",busy:"The editor is busy. Try the canvas example when it is ready."},scrubber:{title:"Room brightness",sliderAria:"Room brightness",off:"Off",watchButton:"Watch room react",watchGuidance:"Watch changes your lights. Leaving this editor or losing connection can leave them at the brightness from Watch. Restoring can overwrite changes made by other controls.",watchingPrefix:"Watching",watchingRestore:"Restore lights",heldStatus:"Trying unsaved changes",heldStatusSave:"Save keeps the shapes. Check light restoration separately."},restoration:{outcomes:{"preview-pending":"preview pending","preview-acknowledged":"preview acknowledged","preview-rejected":"preview rejected","restore-pending":"restore pending","restore-acknowledged":"restore acknowledged","restore-rejected":"restore rejected",skipped:"skipped","outcome-unknown":"outcome unknown"},title:"Light restoration needs review",review:"Review restoration",waiting:"Waiting for light restoration…",acknowledged:"Light restoration request acknowledged",reviewed:"Light restoration reviewed",receiptHelp:"These light effects are separate from saved shapes. Acknowledged means Home Assistant finished the service call; it does not confirm the physical light.",overwriteHelp:"Restoring can overwrite changes made by other controls. Select lights to restore their prior values.",pending:"Completion unconfirmed; conflicting commands remain blocked.",keepHelp:"Keep current lights sends no light commands. It cannot cancel an issued command. If completion is unconfirmed, use Home Assistant’s light controls; this editor cannot confirm completion. Refresh does not cancel it.",close:"Close",keep:"Keep current lights",restore:"Restore selected lights",unavailable:"Unavailable",off:"Off",on:"On · no brightness value",brightness:t=>`On · brightness ${t}/255`,full:"Light restoration history is full. Finish unresolved reviews before Watch.",otherWatching:"Another editor is watching these lights. End Watch there before reviewing restoration.",operationBlocked:"Another light or group operation is pending or unconfirmed in this page. Watch stays blocked.",membershipBlocked:"Light changes are still active in an editor. Finish light restoration review before changing this group.",overlap:"Another editor is using one or more lights, or this group exceeds the light limit. Finish its restoration review before Watch."},footer:{save:"Save",saving:"Saving…",saved:"Saved",failed:"Save failed",retry:"Retry"},coach:{help:"Brightness tips",dismiss:"Dismiss tip",chooseTitle:"Dim a bright light",chooseBody:"Select the light, then choose Dim.",readyTitle:"Ready to save",readyBody:"Save now, or try “Watch room react” first.",savedTitle:"Shape saved",savedBody:"Adjust group brightness in Home Assistant."},presets:{panelAria:"Shapes for selected light",title:"Shapes",emptyTitle:"Select a light.",emptyBody:"Shapes apply to one light at a time.",forLight:t=>`Shapes for ${t}`,explanation:"Choose a shape, then adjust it on the graph.",trying:t=>`Trying ${t}`,chooseForLight:t=>`Choose it to shape ${t}.`,defs:{linear:{name:"Equal brightness",description:"Matches the group brightness."},dim_accent:{name:"Dim accent",description:"Rises gently, capped near 45%."},early_starter:{name:"Early starter",description:"Brightens early, then eases towards full brightness."},late_starter:{name:"Late starter",description:"Stays off through 60%, then rises gradually."}},chipLabels:{linear:"Equal",dim_accent:"Dim",early_starter:"Early",late_starter:"Late"}},legend:{brightnessAria:t=>`${t} brightness`,brightnessAt:(t,e)=>`${t} at ${e}% room brightness`,roomOff:"Raise room brightness to adjust this light.",off:"Off",title:"Lights",emptyCount:"No lights yet",countAllVisible:t=>`${t} ${1===t?"light":"lights"} showing`,countWithHidden:(t,e)=>`${t} ${1===t?"light":"lights"} · ${e} hidden`,listAria:t=>0===t?"No lights in this group":`${t} ${1===t?"light":"lights"} in this group`,manage:"Manage",manageAria:"Manage group",deleteGroup:"Delete group…",deleteError:"Could not delete group.",deleteWrongGroup:"This light is not a Lightener Studio group.",deleteMissingEntry:"This group cannot be deleted here.",deleteConfirm:"Delete this group?",deleteCancel:"Cancel",deleteAction:"Delete group",updating:"Updating lights…"},context:{allLights:"All lights",clearAria:"Show all lights"},graph:{yAxisLabel:"Per-light brightness"},card:{railAria:"Room lights and shapes",loading:"Loading brightness shapes…"},membership:{title:"Edit lights",subtitle:"Choose which lights this group controls. Existing shapes stay exactly as they are.",close:"Close",search:"Search lights",searchPlaceholder:"Search name or ID…",areaFilter:"Area",allAreas:"All areas",currentGroupOnly:t=>`Current group only (${t})`,showExceptional:t=>`Show hidden & disabled (${t})`,candidateList:"Lights available to this group",loading:"Loading lights…",sourceEmpty:"No lights are available to add.",filterEmpty:"No lights match these filters.",clearFilters:"Clear search and area",scopeEmpty:"No lights in this view.",showAllLights:"Show all lights",exceptionalEmpty:t=>`${t} hidden or disabled ${1===t?"light":"lights"}.`,showExceptionalAction:"Show hidden & disabled",hidden:"Hidden",disabled:"Disabled",missing:"Missing",unavailable:"Unavailable",lightCheckboxLabel:(t,e)=>0===e.length?t:`${t}, ${e.join(", ")}`,resultSummary:(t,e,i)=>{const s=`${t} ${1===t?"light":"lights"} shown`;return e===i?`${s} · ${i} selected`:`${s} · ${e} of ${i} selected shown`},selectedCount:t=>`${t} selected`,cancel:"Cancel",apply:"Update lights",applying:"Updating…",applyingStatus:"Updating group lights.",updated:"Lights updated.",tryAgain:"Try again",loadError:"Could not load lights.",applyError:"Could not update lights.",emptyError:"Select at least one light.",conflictError:"This group changed. Close and reopen Edit lights.",disabledError:"A selected light is disabled in Home Assistant. Enable the light in Home Assistant settings, then try again.",reloadError:"The group could not be reloaded. Your previous selection was restored.",rollbackError:"The update failed and the group runtime may need attention. Open Integrations to retry."}},ft=[{id:"linear",...mt.presets.defs.linear,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:50,target:50},{lightener:100,target:100}]},{id:"dim_accent",...mt.presets.defs.dim_accent,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:25,target:8},{lightener:50,target:20},{lightener:100,target:45}]},{id:"early_starter",...mt.presets.defs.early_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:3},{lightener:15,target:36},{lightener:25,target:55},{lightener:50,target:85},{lightener:65,target:93},{lightener:100,target:100}]},{id:"late_starter",...mt.presets.defs.late_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:0},{lightener:60,target:0},{lightener:70,target:10},{lightener:80,target:35},{lightener:90,target:65},{lightener:100,target:100}]}];function yt(t,e,i){const[s,r]=t,[n,o]=e;return s===r?n:n+(i-s)*(o-n)/(r-s)}function bt(t){const e=new Map;let i=null;e.set(0,0);for(const s of t)0!==s.lightener||0===s.target?e.set(s.lightener,s.target):i=s.target;if(null===i||e.has(1)||e.set(1,i),!e.has(100)){let t=-1,i=100;for(const[s,r]of e)0!==s&&s>t&&(t=s,i=r);e.set(100,i)}const s=[];for(const[t,i]of e)s.push({lightener:t,target:i});return s.sort((t,e)=>t.lightener-e.lightener),s}function wt(t,e){return function(t,e){if(0===t.length)return 0;const i=Math.max(0,Math.min(100,e));if(i<=t[0].lightener)return t[0].target;for(let e=1;e<t.length;e++){const s=t[e-1],r=t[e];if(i===r.lightener)return r.target;if(i<r.lightener)return yt([s.lightener,r.lightener],[s.target,r.target],i)}return t[t.length-1].target}(bt(t),e)}const xt=44,It=12,$t=300,kt=200,Ct=356,St=248;function Et(t){return xt+t/100*$t}function Pt(t){return It+(1-t/100)*kt}function Tt(t,e,i){return Math.max(e,Math.min(i,t))}function At(t){const e=t.length;if(0===e)return{dx:[],tangents:[]};if(1===e)return{dx:[],tangents:[0]};const i=[],s=[],r=[];for(let n=0;n<e-1;n++)i.push(t[n+1].x-t[n].x),s.push(t[n+1].y-t[n].y),r.push(0===i[n]?0:s[n]/i[n]);const n=new Array(e).fill(0);if(2===e)return n[0]=r[0],n[1]=r[0],{dx:i,tangents:n};n[0]=r[0],n[e-1]=r[e-2];for(let t=1;t<e-1;t++)0===r[t-1]||0===r[t]||r[t-1]*r[t]<=0?n[t]=0:n[t]=(r[t-1]+r[t])/2;for(let t=0;t<e-1;t++){if(0===r[t]){n[t]=0,n[t+1]=0;continue}const e=n[t]/r[t],i=n[t+1]/r[t],s=e*e+i*i;if(s>9){const o=3/Math.sqrt(s);n[t]=o*e*r[t],n[t+1]=o*i*r[t]}}return{dx:i,tangents:n}}function Rt(t,e){return Math.max(0,Math.min(100,wt(t,e)))}function Lt(t,e){const i=bt(t).map(t=>({x:t.lightener,y:t.target}));return Math.max(0,Math.min(100,function(t,e){if(t.length<2)return 0;if(2===t.length){const[i,s]=t,r=s.x-i.x;if(0===r)return i.y;const n=(e-i.x)/r;return i.y+n*(s.y-i.y)}const{dx:i,tangents:s}=At(t);let r=0;for(let i=0;i<t.length-1;i++){if(e<=t[i+1].x){r=i;break}r=i}const n=i[r]||1,o=Tt((e-t[r].x)/n,0,1),a=n/3,l=1-o;return l*l*l*t[r].y+3*l*l*o*(t[r].y+s[r]*a)+3*l*o*o*(t[r+1].y-s[r+1]*a)+o*o*o*t[r+1].y}(i,e)))}const Mt=["#42a5f5","#ef5350","#5c6bc0","#ffa726","#ab47bc","#1565c0","#ec407a","#8d6e63","#ffca28","#7e57c2"];function Dt(t){if(t.length<2)return"";if(2===t.length)return`M${t[0].x},${t[0].y} L${t[1].x},${t[1].y}`;const{dx:e,tangents:i}=At(t);let s=`M${t[0].x},${t[0].y}`;for(let r=0;r<t.length-1;r++){const n=e[r]/3;s+=` C${t[r].x+n},${t[r].y+i[r]*n} ${t[r+1].x-n},${t[r+1].y-i[r+1]*n} ${t[r+1].x},${t[r+1].y}`}return s}function Ot(t){const e=bt(t).map(t=>({x:t.lightener,y:t.target}));if(e.length<2)return[];const{dx:i,tangents:s}=At(e);return e.slice(0,-1).map((t,r)=>{const n=e[r+1],o=i[r]/3;return{x0:t.x,x1:n.x,y:[t.y,t.y+s[r]*o,n.y-s[r+1]*o,n.y]}})}function Gt(t,e){if(!t.length)return 0;const i=t.find(t=>e<=t.x1)??t[t.length-1],s=Tt((e-i.x0)/(i.x1-i.x0||1),0,1),r=1-s,[n,o,a,l]=i.y;return Tt(r*r*r*n+3*r*r*s*o+3*r*s*s*a+s*s*s*l,0,100)}const Ft=["","8 4","4 4","12 4 4 4","2 4"],Nt=["circle","square","diamond","triangle","bar"];function Ut(t){return 1-Math.pow(1-t,3)}const Ht="cubic-bezier(0.33, 1, 0.68, 1)",Bt=["settle","diagonal","ripple","draw_in"],zt=Object.freeze({settle:!0,diagonal:!0,ripple:!0,draw_in:!0}),Vt=Object.freeze({orientation:660,cueFade:330,cuePause:1540,presetLead:440,slowFactor:4.4,pulse:1980,context:5500}),qt=500;const jt="(prefers-reduced-motion: reduce)";function Wt(){return window.matchMedia?.(jt).matches??!1}function Kt(t){const e=window.matchMedia?.(jt);if(!e)return()=>{};const i=e=>{e.matches&&t()};return e.addEventListener("change",i),()=>e.removeEventListener("change",i)}function Yt(t,e){return t[e]&&!Wt()}function Jt(t,e,i){const s=performance.now();let r=!0,n=0;const o=a=>{if(!r)return;const l=Math.max(0,a-s);if(l>=t)return r=!1,void i?.();e(l),r&&(n=requestAnimationFrame(o))};return n=requestAnimationFrame(o),()=>{r&&(r=!1,cancelAnimationFrame(n))}}function Xt(t,e){if(0===e||t<=0||t>=250)return 0;const i=-2*Math.sign(e);if(t<70)return i*Ut(t/70);return i*(1-Ut((t-70)/180))}const Zt=["diag","floor","ceil"],Qt={diag:(t,e)=>Math.abs(e-t),floor:(t,e)=>e,ceil:(t,e)=>100-e};function te(t,e,i,s){const r=s=>0===Qt[s](e,i)&&("diag"!==s||t>0);return{held:Zt.filter(t=>r(t)||s.includes(t)&&Qt[t](e,i)<2),landed:Zt.find(t=>r(t)&&!s.includes(t))??null}}function ee(t){return{points:t,pieces:Ot([...t])}}function ie(t,e,i){return i>=1?e:t+(e-t)*i}function se(t){return t.length?[...t.map(t=>t.x0),t[t.length-1].x1]:[]}function re(t,e){const i=(e-t.x0)/(t.x1-t.x0),[s,r,n,o]=t.y,a=ie(s,r,i),l=ie(r,n,i),h=ie(n,o,i),d=ie(a,l,i),c=ie(l,h,i),p=ie(d,c,i);return[{x0:t.x0,x1:e,y:[s,a,d,p]},{x0:e,x1:t.x1,y:[p,c,h,o]}]}function ne(t,e){const i=[...new Set([...se(t),...se(e)])].sort((t,e)=>t-e),s=t=>{const e=[];for(const s of t){let t=s;for(const s of i){if(s<=t.x0||s>=t.x1)continue;const[i,r]=re(t,s);e.push(i),t=r}e.push(t)}return e};return[s(t),s(e)]}function oe(t,e,i){const s=(t.x1-t.x0)/3,r=[t.x0,t.x0+s,t.x1-s,t.x1];return{x0:t.x0,x1:t.x1,y:t.y.map((t,s)=>ie(t,e.y[s],i(r[s])))}}function ae(t,e){return t.points.find(t=>t.lightener===e)?.target??Gt(t.pieces,e)}function le(t,e){const i=[...new Set([...t.points,...e.points].map(t=>t.lightener))].sort((t,e)=>t-e),[s,r]=ne(t.pieces,e.pieces);return{xs:i,from:i.map(e=>ae(t,e)),to:i.map(t=>ae(e,t)),piecesFrom:s,piecesTo:r}}function he(t){const e=t.xs.length-1;return e>0?Math.min(20,140/e):0}function de(t){return 300+he(t)*(t.xs.length-1)}function ce(t,e){const i=he(t),s=t.xs.map((t,s)=>Ut(Tt((e-s*i)/300,0,1))),r=e=>{const i=t.xs.findIndex(t=>t>=e);if(-1===i)return s[s.length-1];if(0===i)return s[0];const[r,n]=[t.xs[i-1],t.xs[i]];return s[i-1]+(s[i]-s[i-1])*(e-r)/(n-r)};return{points:t.xs.map((e,i)=>({lightener:e,target:ie(t.from[i],t.to[i],s[i])})),pieces:t.piecesFrom.map((e,i)=>oe(e,t.piecesTo[i],r))}}function pe(t,e){const i=new Map(e.points.map(t=>[t.lightener,t.target]));return t.map(t=>({lightener:t.lightener,target:i.get(t.lightener)??t.target}))}function ue(t,e,i){const[s,r]=ne(t,e);return s.map((t,e)=>oe(t,r[e],()=>i))}const _e=Vt.orientation,ve=Vt.cuePause,ge=Vt.slowFactor,me=new Set,fe=t=>`lightener:first-use:v1:${t}`;function ye(t,e){me.add(t);try{localStorage.setItem(fe(t),e)}catch{}}function be(t){return t.length>0&&t.every(t=>t.controlPoints.length>=2&&t.controlPoints.every(t=>t.lightener===t.target))}class we{constructor(t){this.changed=t,this.curve=null,this.moving=!1,this.cueAnimating=!1,this.showInstruction=!1,this.presetHighlighted=!1,this._cancelFrame=null,this._motionTimer=null,this._presetTimer=null,this._instructionTimer=null}start(t,e){this.clear();const i=ft.find(t=>"dim_accent"===t.id),s=le(ee(t.controlPoints),ee(i.controlPoints)),r=e=>{const i=ce(s,e).points.map(t=>({lightener:t.lightener,target:Math.round(t.target)}));this.curve={...t,controlPoints:i},this.changed()};this.showInstruction=!0;const n=e&&!Wt();this.cueAnimating=n,this.presetHighlighted=!n,r(n?0:de(s)),n?(this._presetTimer=setTimeout(()=>{this._presetTimer=null,this.presetHighlighted=!0,this.changed()},ve-Vt.presetLead),this._motionTimer=setTimeout(()=>{this._motionTimer=null,Wt()?this.freeze():(this.moving=!0,this.changed(),this._cancelFrame=Jt(Math.round(de(s)*ge),t=>{Wt()?this.freeze():r(t/ge)},()=>{this._cancelFrame=null,this.moving=!1,r(de(s)),this._fadeInstructionLater()}))},ve)):this._fadeInstructionLater()}_fadeInstructionLater(){this.showInstruction&&null===this._instructionTimer&&(this._instructionTimer=setTimeout(()=>{this._instructionTimer=null,this.showInstruction=!1,this.cueAnimating=!1,this.changed()},Vt.context))}freeze(){null!==this._presetTimer&&clearTimeout(this._presetTimer),this._presetTimer=null,this.presetHighlighted=!1,null!==this._motionTimer&&clearTimeout(this._motionTimer),this._motionTimer=null,this._cancelFrame?.(),this._cancelFrame=null,this.moving=!1,this.cueAnimating=!1,this._fadeInstructionLater(),this.changed()}clear(){null!==this._presetTimer&&clearTimeout(this._presetTimer),this._presetTimer=null,this.presetHighlighted=!1,null!==this._motionTimer&&clearTimeout(this._motionTimer),this._motionTimer=null,this._cancelFrame?.(),this._cancelFrame=null,null!==this._instructionTimer&&clearTimeout(this._instructionTimer),this._instructionTimer=null,this.curve=null,this.moving=!1,this.cueAnimating=!1,this.showInstruction=!1,this.changed()}}const xe="lightener_studio",Ie="lightener-curve-card",$e="custom:lightener-curve-card";function ke(t,e){return"light"===e.split(".")[0]&&t.entities?.[e]?.platform===xe}function Ce(t,e){customElements.get(t)||customElements.define(t,e)}class Se{constructor(t,e){this.isConnected=t,this.requestUpdate=e,this.ready=!1,this.started=!1}ensureLoaded(){if(this.started)return;if(this.started=!0,customElements.get("ha-entity-picker"))return void(this.ready=!0);(async()=>{try{const t=window.loadCardHelpers;"function"==typeof t&&await t()}catch{}try{const t=customElements.get("hui-entities-card");await(t?.getConfigElement?.())}catch{}})();const t=customElements.whenDefined("ha-entity-picker"),e=new Promise(t=>setTimeout(t,1500));Promise.race([t,e]).then(()=>{this.isConnected()&&(this.ready=!!customElements.get("ha-entity-picker"),this.ready||(console.warn("[lightener] <ha-entity-picker> not available — falling back to plain input."),customElements.whenDefined("ha-entity-picker").then(()=>{this.isConnected()&&(this.ready=!0,this.requestUpdate())}).catch(()=>{})),this.requestUpdate())}).catch(()=>{})}}function Ee(t){const e={};for(const i of t){const t={};let s=-1,r=0;for(const e of i.controlPoints)Number.isFinite(e.lightener)&&Number.isFinite(e.target)&&(e.lightener<0||e.lightener>100||e.target<0||e.target>100||0===e.lightener&&0===e.target||(t[String(e.lightener)]=String(e.target),e.lightener>s&&(s=e.lightener,r=e.target)));!("100"in t)&&s>=0&&(t[100]=String(r)),e[i.entityId]={brightness:t}}return e}function Pe(t,e,i){return Object.keys(t).map((s,r)=>{const n=t[s]?.brightness??{},o=new Map([[0,0]]);for(const[t,e]of Object.entries(n)){const i=Number(t),s=Number(e);Number.isFinite(i)&&Number.isFinite(s)&&(i<0||i>100||s<0||s>100||o.set(i,s))}const a=[...o].map(([t,e])=>({lightener:t,target:e}));a.sort((t,e)=>t.lightener-e.lightener);const l=e[s]?.attributes?.friendly_name??s.replace("light.","");return{entityId:s,friendlyName:l,controlPoints:a,visible:!0,color:i[r%i.length]}})}function Te(t){return{...t,controlPoints:t.controlPoints.map(t=>({...t}))}}function Ae(t){return t.map(Te)}function Re(t,e){if(t.length!==e.length)return!1;for(let i=0;i<t.length;i++){const s=t[i].controlPoints,r=e[i].controlPoints;if(s.length!==r.length)return!1;for(let t=0;t<s.length;t++){if(s[t].lightener!==r[t].lightener)return!1;if(s[t].target!==r[t].target)return!1}}return!0}function Le(t){return!!t&&"object"==typeof t&&!Array.isArray(t)}function Me(t){return Le(t)&&Object.values(t).every(t=>Le(t)&&(void 0===t.brightness||Le(t.brightness)))}function De(t,e=!1){return Le(t)&&Me(t.entities)&&"string"==typeof t.config_entry_id&&t.config_entry_id&&"string"==typeof t.revision&&/^v1:[0-9a-f]{64}$/.test(t.revision)&&(e?"saved"===t.status||"unchanged"===t.status:Le(t.capabilities)&&1===t.capabilities.guarded_curve_save)?structuredClone({config_entry_id:t.config_entry_id,revision:t.revision,entities:t.entities}):null}function Oe(t){return Array.isArray(t)?`[${t.map(Oe).join(",")}]`:Le(t)?`{${Object.keys(t).sort().map(e=>`${JSON.stringify(e)}:${Oe(t[e])}`).join(",")}}`:JSON.stringify(t)}function Ge(t,e){return JSON.stringify(Object.keys(t))===JSON.stringify(Object.keys(e))&&Oe(t)===Oe(e)}function Fe(t,e){return t.controlPoints.length===e.controlPoints.length&&t.controlPoints.every((t,i)=>t.lightener===e.controlPoints[i].lightener&&t.target===e.controlPoints[i].target)}function Ne(t,e){const i=new Map(t.map(t=>[t.entityId,t]));return e.filter(t=>{const e=i.get(t.entityId);return!e||!Fe(e,t)})}function Ue(t,e){const i=structuredClone(t);for(const[t,s]of Object.entries(e))i[t]={...i[t],brightness:{...s.brightness}};return i}function He(t,e,i){const s=new Map(t.map(t=>[t.entityId,t])),r=new Map(i.map(t=>[t.entityId,t]));return Ne(t,e).map(t=>{const e=r.get(t.entityId);return{entityId:t.entityId,friendlyName:t.friendlyName,local:t,kind:e?Fe(e,t)?"already-saved":s.has(t.entityId)&&Fe(e,s.get(t.entityId))?"unchanged":"conflicting":"removed"}})}class Be extends ct{constructor(){super(...arguments),this._choices={},this._acknowledged=!1,this._mountGeneration=0,this._finished=!1}_onDialogKeydown(t){(t.ctrlKey||t.metaKey)&&"s"===t.key.toLowerCase()?(t.preventDefault(),t.stopPropagation()):"Escape"===t.key&&t.stopPropagation()}connectedCallback(){super.connectedCallback();const t=++this._mountGeneration;this._finished=!1,this.updateComplete.then(()=>{if(!this.isConnected||t!==this._mountGeneration||this._finished)return;const e=this.renderRoot.querySelector("dialog");e&&!e.open&&(e.showModal(),this.renderRoot.querySelector("h2")?.focus())})}disconnectedCallback(){this._mountGeneration++,this._finished=!0,this.renderRoot.querySelector("dialog")?.close(),super.disconnectedCallback()}_finish(t){this._finished||(this._finished=!0,this.renderRoot.querySelector("dialog")?.close(),this.dispatchEvent(t))}_close(){this._finish(new CustomEvent("review-dismiss"))}_accept(t){const e=new Set(this.review.members.filter(t=>"unchanged"===t.kind||!0===this._choices[t.entityId]).map(t=>t.entityId));this._finish(new CustomEvent("review-accept",{detail:{keep:t?new Set:e}}))}render(){if(!this.review)return q``;const t=this.review.members.some(t=>"removed"===t.kind),e=this.review.members.every(t=>"conflicting"!==t.kind||t.entityId in this._choices);return q`<dialog
      aria-labelledby="review-title"
      @keydown=${this._onDialogKeydown}
      @cancel=${t=>{t.preventDefault(),this._close()}}
    >
      <h2 id="review-title" tabindex="-1">${mt.saveReview.title}</h2>
      <p>${mt.saveReview.body}</p>
      ${this.review.members.map(t=>q`<div class="member">
            <strong>${t.friendlyName}</strong>
            ${"conflicting"===t.kind?q`<div class="choices">
                  ${[!0,!1].map(e=>q`<label
                        ><input
                          type="radio"
                          name=${t.entityId}
                          .checked=${this._choices[t.entityId]===e}
                          @change=${()=>{this._choices={...this._choices,[t.entityId]:e}}}
                        />${e?mt.saveReview.keep:mt.saveReview.saved}</label
                      >`)}
                </div>`:q`<p>
                  ${"removed"===t.kind?mt.saveReview.removed:"already-saved"===t.kind?mt.saveReview.alreadySaved:mt.saveReview.unchanged}
                </p>`}
          </div>`)}
      ${t?q`<label
            ><input
              type="checkbox"
              .checked=${this._acknowledged}
              @change=${t=>{this._acknowledged=t.target.checked}}
            />${mt.saveReview.acknowledgeRemoved}</label
          >`:""}
      <footer>
        <button @click=${()=>this._close()}>${mt.saveReview.back}</button
        ><button ?disabled=${t&&!this._acknowledged} @click=${()=>this._accept(!0)}>
          ${mt.saveReview.useSaved}</button
        ><button
          ?disabled=${!e||t&&!this._acknowledged}
          @click=${()=>this._accept(!1)}
        >
          ${mt.saveReview.continue}
        </button>
      </footer>
    </dialog>`}}Be.styles=a`
    :host {
      display: contents;
    }
    dialog {
      width: min(600px, calc(100vw - 40px));
      max-height: calc(100dvh - 40px);
      overflow: auto;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #20252a);
      font: inherit;
      box-shadow: 0 24px 70px rgb(0 0 0 / 0.34);
      padding: 22px;
      box-sizing: border-box;
    }
    dialog::backdrop {
      background: rgb(10 15 18 / 0.58);
    }
    h2 {
      font-size: 20px;
      margin: 0;
    }
    p {
      font-size: 13px;
      line-height: 1.5;
      color: var(--secondary-text-color, #66717b);
    }
    .member {
      padding: 12px 0;
      border-top: 1px solid var(--divider-color, #ddd);
      overflow-wrap: anywhere;
    }
    .choices,
    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      min-height: 44px;
    }
    button {
      min-height: 44px;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 6px;
      background: transparent;
      color: var(--primary-color, #1590ad);
      font: inherit;
      padding: 0 12px;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    :focus-visible {
      outline: 2px solid var(--primary-color, #1590ad);
      outline-offset: 2px;
    }
  `,t([vt({attribute:!1})],Be.prototype,"review",void 0),t([gt()],Be.prototype,"_choices",void 0),t([gt()],Be.prototype,"_acknowledged",void 0),Ce("save-conflict-review",Be);const ze={records:32,recordBytes:4194304,totalBytes:16777216};function Ve(t){return t.map(t=>({entityId:t.entityId,points:t.controlPoints.map(t=>({lightener:t.lightener,target:t.target}))}))}function qe(t,e){return JSON.stringify(t)===JSON.stringify(e)}function je(t){if(!Array.isArray(t))return null;const e=new Set,i=[];for(const s of t){if(!s||"string"!=typeof s.entityId||!s.entityId||e.has(s.entityId)||!Array.isArray(s.points))return null;e.add(s.entityId);const t=[];for(const e of s.points){if(!e||!Number.isFinite(e.lightener)||!Number.isFinite(e.target)||e.lightener<0||e.lightener>100||e.target<0||e.target>100)return null;t.push({lightener:e.lightener,target:e.target})}i.push({entityId:s.entityId,points:t})}return i}function We(t){if(!t||1!==t.schema||"string"!=typeof t.entityId||!t.entityId||!(null===t.baselineRevision||"string"==typeof t.baselineRevision&&/^v1:[0-9a-f]{64}$/.test(t.baselineRevision))||!["ordinary","conflict","unknown","reread","runtime","unsupported"].includes(t.outcome)||!Array.isArray(t.undo)||t.undo.length>50)return null;const e=je(t.baseline),i=je(t.local),s=Array.from(t.undo,je);return e&&i&&!s.some(t=>!t)?{schema:1,entityId:t.entityId,baselineRevision:t.baselineRevision,baseline:e,local:i,undo:s,outcome:t.outcome}:null}const Ke=t=>JSON.stringify([t.origin,t.userId,t.authEpoch,t.configEntryId,t.surface]),Ye=(t,e)=>JSON.stringify([t.origin,t.userId,t.authEpoch,e]);const Je=new class{constructor(t=ze){this._limits=t,this._principals=new Map,this._epoch=0,this._records=new Map,this._subscribers=new Map,this._barriers=new Set,this._writes=new Map,this._writeGenerations=new Map}activatePrincipal(t,e){if("string"!=typeof t||!t||"string"!=typeof e||!e.trim())throw new Error("Authenticated identity required");const i=this._principals.get(t);if(i?.userId===e)return{...i};if(i){this._principals.delete(t);for(const[e,i]of this._records)i.scope.origin===t&&this._records.delete(e);for(const e of this._barriers)JSON.parse(e)[0]===t&&this._barriers.delete(e);for(const e of this._writeGenerations.keys())JSON.parse(e)[0]===t&&this._writeGenerations.delete(e);for(const e of this._writes.keys())JSON.parse(e)[0]===t&&this._writes.delete(e);for(const[e,i]of this._subscribers)if(JSON.parse(e)[0]===t){for(const t of i)t();this._subscribers.delete(e)}}const s={origin:t,userId:e,authEpoch:++this._epoch};return this._principals.set(t,s),{...s}}isCurrent(t){const e=this._principals.get(t.origin);return!!e&&e.userId===t.userId&&e.authEpoch===t.authEpoch}_validScope(t){return this.isCurrent(t)&&"string"==typeof t.configEntryId&&!!t.configEntryId&&["sidebar","dashboard"].includes(t.surface)}_notify(t){for(const e of this._subscribers.get(Ke(t))??[])e()}_notifyGroup(t,e){for(const i of["sidebar","dashboard"])this._notify({...t,configEntryId:e,surface:i})}_matches(t,e){return this._validScope(t)&&!!e&&Ke(t)===Ke(e.scope)}_owned(t,e){const i=this._records.get(e.draftId);return this._matches(t,i)&&i.ownerId===e.ownerId&&i.claimEpoch===e.claimEpoch&&i.version===e.version?i:void 0}owns(t,e){return!!this._owned(t,e)}_claim(t){return{draftId:t.draftId,ownerId:t.ownerId,claimEpoch:t.claimEpoch,version:t.version}}_size(t,e){return(new TextEncoder).encode(JSON.stringify({scope:t,payload:e})).byteLength}_fits(t,e=0){let i=t-e;for(const t of this._records.values())i+=t.bytes;return t<=this._limits.recordBytes&&i<=this._limits.totalBytes}create(t,e,i){const s=We(i);if(!this._validScope(t)||"string"!=typeof e||!e||!s||qe(s.baseline,s.local))return{ok:!1,reason:"invalid"};const r={origin:t.origin,userId:t.userId,authEpoch:t.authEpoch,configEntryId:t.configEntryId,surface:t.surface},n=this._size(r,s);if(this._records.size>=this._limits.records||!this._fits(n))return{ok:!1,reason:"capacity"};const o={scope:r,payload:s,draftId:crypto.randomUUID(),ownerId:e,claimEpoch:1,version:1,createdAt:Date.now(),updatedAt:Date.now(),complete:!0,bytes:n};this._records.set(o.draftId,o);const a=this._claim(o);return this._notify(t),{ok:!0,value:a}}update(t,e,i){const s=this._owned(t,e);if(!s)return{ok:!1,reason:"stale"};const r=We(i),n=r?this._size(s.scope,r):1/0;if(!r||!this._fits(n,s.bytes)){s.complete=!1,s.version++;const e=this._claim(s);return this._notify(t),{ok:!1,reason:r?"capacity":"invalid",claim:e}}s.payload=r,s.bytes=n,s.complete=!0,s.version++,s.updatedAt=Date.now();const o=this._claim(s);return this._notify(t),{ok:!0,value:o}}list(t){return this._validScope(t)?[...this._records.values()].filter(e=>this._matches(t,e)&&!e.ownerId).map(t=>({draftId:t.draftId,version:t.version,updatedAt:t.updatedAt,complete:t.complete,affectedIds:t.payload.local.filter(e=>!qe([e],t.payload.baseline.filter(t=>t.entityId===e.entityId))).map(t=>t.entityId)})):[]}claim(t,e,i,s){const r=this._records.get(e);if(!this._matches(t,r)||"string"!=typeof s||!s||r.version!==i)return{ok:!1,reason:"stale"};if(r.ownerId)return{ok:!1,reason:"busy"};r.ownerId=s,r.claimEpoch++;const n={claim:this._claim(r),payload:structuredClone(r.payload)};return this._notify(t),{ok:!0,value:n}}release(t,e){const i=this._owned(t,e);if(!i)return null;i.ownerId=null;const s={draftId:i.draftId,ownerId:e.ownerId,releasedEpoch:i.claimEpoch,version:i.version};return this._notify(t),s}resume(t,e){const i=this._records.get(e.draftId);if(!this._matches(t,i)||i.ownerId||i.claimEpoch!==e.releasedEpoch||i.version!==e.version)return{ok:!1,reason:"lost"};i.ownerId=e.ownerId,i.claimEpoch++;const s={claim:this._claim(i),payload:structuredClone(i.payload)};return this._notify(t),{ok:!0,value:s}}clear(t,e){const i=this._owned(t,e);return!!i&&(this._records.delete(i.draftId),this._notify(t),!0)}subscribe(t,e){if(!this._validScope(t))return()=>{};const i=Ke(t),s=this._subscribers.get(i)??new Set;return s.add(e),this._subscribers.set(i,s),()=>{s.delete(e),s.size||this._subscribers.delete(i)}}markRuntimeBlocked(t,e){this.isCurrent(t)&&"string"==typeof e&&e&&(this._barriers.add(Ye(t,e)),this._notifyGroup(t,e))}isRuntimeBlocked(t,e){return this.isCurrent(t)&&this._barriers.has(Ye(t,e))}beginWrite(t,e,i){if(!this.isCurrent(t)||"string"!=typeof e||!e||"string"!=typeof i||!i)return;const s=Ye(t,e),r=this._writes.get(s)??new Map;r.has(i)||(this._writeGenerations.set(s,(this._writeGenerations.get(s)??0)+1),r.set(i,"pending"),this._writes.set(s,r),this._notifyGroup(t,e))}settleWrite(t,e,i,s){if(!this.isCurrent(t))return;const r=this._writes.get(Ye(t,e));if(r?.has(i)){if("runtime"===s&&this.markRuntimeBlocked(t,e),"unknown"===s||"runtime"===s){if("pending"===r.get(i)){const i=Ye(t,e);this._writeGenerations.set(i,(this._writeGenerations.get(i)??0)+1)}r.set(i,"unknown")}else r.delete(i);r.size||this._writes.delete(Ye(t,e)),this._notifyGroup(t,e)}}writeGeneration(t,e){return this.isCurrent(t)?this._writeGenerations.get(Ye(t,e))??0:0}hasUnknownWrite(t,e){return this.isCurrent(t)&&[...this._writes.get(Ye(t,e))?.values()??[]].includes("unknown")}hasUnresolvedWrite(t,e){return this.isCurrent(t)&&!!this._writes.get(Ye(t,e))?.size}};function Xe(t,e){const i=t.find(t=>t.entityId===e);return!!i&&i.visible}function Ze(t,e){!function(t,e){t.push(Ae(e)),t.length>50&&t.shift()}(t,e)}function Qe(t,e,i){return function(t,e,i){const s=t[e];if(!s)return null;if(s.controlPoints.length<=2)return null;if(0===i)return null;if(!Number.isInteger(i)||i<0||i>=s.controlPoints.length)return null;const r=[...t],n={...r[e]};return n.controlPoints=n.controlPoints.filter((t,e)=>e!==i),r[e]=n,r}(t,e,i)}function ti(t,e){const i=t?.states[e];if("off"===i?.state)return"off";if("on"!==i?.state)return null;const s=i.attributes.brightness;return void 0===s?"on":Number.isFinite(s)&&s>=0&&s<=255?s:null}function ei(t){const e=t?.user?.id?.trim();return e?`${location.origin}/${e}`:null}function ii(t){return!!t&&!!ei(t)&&t.user.is_admin&&!1!==t.connected&&!1!==t.connection?.connected}const si=new Set(["not_found","invalid_format","service_validation_error","home_assistant_error","unknown_error","unauthorized"]);function ri(t){if(!t||"object"!=typeof t||Object.getPrototypeOf(t)!==Object.prototype)return!1;const e=t;return"string"==typeof e.code&&si.has(e.code)&&"string"==typeof e.message}const ni=new class{constructor(){this._serial=0,this._sessions=new Map,this._reservations=new Map,this._mutations=new Map,this._listeners=new Set}subscribe(t){return this._listeners.add(t),()=>this._listeners.delete(t)}list(t,e){return[...this._sessions.values()].filter(i=>i.principal===t&&i.group===e)}create(t,e,i,s=e){const r=[...this._sessions.values()].filter(t=>"settled"===t.phase);for(const t of r.slice(0,Math.max(0,r.length-15)))this._sessions.delete(t.id);if(this._sessions.size>=128)return null;const n={id:++this._serial,principal:t,group:e,entry:s,owner:i,generation:1,revision:0,phase:"watching",automatic:!0,lights:new Map};return this._sessions.set(n.id,n),n}reserve(t,e){if(this._mutations.has(t.group))return!1;if(e.some(e=>this._reservations.has(e)&&this._reservations.get(e)!==t.id))return!1;if(t.lights.size+e.filter(e=>!t.lights.has(e)).length>256)return!1;for(const i of e)this._reservations.set(i,t.id);return!0}beginMutation(t,e){if(this._mutations.size>=128||this._mutations.has(t)||e.some(t=>this._reservations.has(t)))return null;const i=`mutation:${crypto.randomUUID()}`;this._mutations.set(t,i);for(const t of e)this._reservations.set(t,i);for(const t of this._listeners)t();return()=>{if(this._mutations.get(t)===i){this._mutations.delete(t);for(const t of e)this._reservations.get(t)===i&&this._reservations.delete(t);for(const t of this._listeners)t()}}}mutationBlocked(t){return this._mutations.has(t)}changed(t){if(t.revision++,"watching"!==t.phase){const e=[...t.lights.values()].some(t=>t.pending||!t.disposition);t.phase=e?t.automatic?"stopping":"needs-review":"settled"}for(const e of t.lights.values())!e.pending&&e.disposition&&this._reservations.get(e.entityId)===t.id&&this._reservations.delete(e.entityId);for(const t of this._listeners)t()}stop(t,e){if("settled"!==t.phase){if(t.generation++,t.automatic&&=e,!e)for(const e of t.lights.values())e.pending&&(e.uncertain=!0,e.outcome="outcome-unknown");t.phase="stopping",this.changed(t)}}abandon(t){if("watching"!==t.phase){this.stop(t,!1);for(const e of t.lights.values())e.disposition=!0;this.changed(t)}}issue(t,e,i,s,r){if(e.pending||s&&"watching"===t.phase)return;e.pending=!0,e.uncertain=!1,e.operation++;const n=e.operation;e.target=i,e.outcome=s?"restore-pending":"preview-pending",e.disposition=!1,this.changed(t);const o=setTimeout(()=>{e.pending&&e.operation===n&&(e.outcome="outcome-unknown",this.stop(t,!1))},1e4),a=(r,a)=>{if(clearTimeout(o),e.operation===n){if(!r)return e.outcome="outcome-unknown",void this.stop(t,!1);e.pending=!1,e.outcome=a?s?"restore-acknowledged":"preview-acknowledged":s?"restore-rejected":"preview-rejected",a&&(e.acknowledged=i),s&&a&&!e.uncertain&&(e.disposition=!0),a||this.stop(t,!1),this.changed(t)}};try{Promise.resolve(r.callService("light","off"===i?"turn_off":"turn_on",{entity_id:e.entityId,..."number"==typeof i?{brightness:i}:{},transition:.25},void 0,!1)).then(t=>a(function(t){const e=t;return"string"==typeof e?.context?.id&&e.context.id.length>0}(t),!0),t=>a(ri(t),!1))}catch(t){a(ri(t),!1)}}};class oi{constructor(t,e=300,i=ni){this._host=t,this._intervalMs=e,this._registry=i,this._active=!1,this._rafPending=!1,this._trailingTimer=null,this._session=null,this._unsubscribe=null,this._onConnectionLost=()=>this.disconnect(),this._queued=new Map,this._advancing=!1,this.admissionIssue=null,this._lastBrightness=new Map,this._frameGeneration=0,this._pending=null,this.lastPreviewTime=0}get active(){return this._active}get sessions(){const t=ei(this._host.getHass()),e=this._host.getStorageEntityId();return t&&e?this._registry.list(t,e):[]}get reviewSessions(){return this.sessions.filter(t=>"watching"!==t.phase)}get otherWatching(){return this.sessions.some(t=>"watching"===t.phase&&t!==this._session)}get mutationBlocked(){return this._registry.mutationBlocked(this._host.getStorageEntityId()??"")}get blocked(){return this.sessions.some(t=>"settled"!==t.phase)||this._registry.mutationBlocked(this._host.getStorageEntityId()??"")}connect(){this.observe(),this._unsubscribe??=this._registry.subscribe(()=>{this._advance(),this._host.restorationChanged?.()})}observe(){const t=this._host.getHass();if(this._connection!==t?.connection&&(this._session&&this.disconnect(),this._connection?.removeEventListener("disconnected",this._onConnectionLost),this._connection=t?.connection,this._connection?.addEventListener("disconnected",this._onConnectionLost)),this._session&&!this._authorized(this._session)&&this.disconnect(),this._active&&this._session)for(const e of this._session.lights.values())e.pending||void 0===e.acknowledged||ti(t,e.entityId)===e.acknowledged||(e.conflicted=!0,e.outcome="skipped",this._queued.delete(e.entityId))}_authorized(t){const e=this._host.getHass();return ii(e)&&ei(e)===t.principal&&this._host.getStorageEntityId()===t.group&&(this._host.getConfigEntryId?.()??t.group)===t.entry&&(this._host.canDispatch?.()??!0)}start(){this.connect();const t=this._host.getHass(),e=this._host.getStorageEntityId();if(ii(t)&&e&&!this._active&&!this.blocked&&(this._host.canDispatch?.()??1)){if(this.admissionIssue=null,this._session=this._registry.create(ei(t),e,crypto.randomUUID(),this._host.getConfigEntryId?.()??e),!this._session)return this.admissionIssue=mt.restoration.full,void this._host.restorationChanged?.();this._active=!0,this._host.setPreviewActive(!0),null===this._host.getScrubberPosition()&&(this._host.setScrubberPosition(50),this._host.persistScrubberPosition(e,50)),this._lastBrightness.clear(),this.refresh(!0)}}_fence(){this._active=!1,this._host.setPreviewActive(!1),this._rafPending=!1,this._frameGeneration++,this._pending=null,this._queued.clear(),this._clearTrailingTimer()}stop(t=!0){this._fence();const e=this._session;return e?("watching"===e.phase?this._registry.stop(e,t):t||this._registry.stop(e,!1),this._advance(),"stopping"!==e.phase?Promise.resolve("settled"===e.phase):new Promise(t=>{const i=this._registry.subscribe(()=>{"stopping"!==e.phase&&(i(),t("settled"===e.phase))})})):Promise.resolve(!this.blocked)}disconnect(){this._fence(),this._session&&this._registry.stop(this._session,!1),this._unsubscribe?.(),this._unsubscribe=null,this._connection?.removeEventListener("disconnected",this._onConnectionLost),this._connection=void 0,this._session=null}_advance(){if(!this._advancing){this._advancing=!0;try{const t=this._session;if(!t)return;if("watching"!==t.phase&&this._active&&this._fence(),!this._authorized(t))return void("settled"!==t.phase&&this._registry.stop(t,!1));const e=this._host.getHass();for(const i of t.lights.values())if(!i.pending&&!i.disposition)if(this._active&&"watching"===t.phase&&!i.conflicted){const t=this._queued.get(i.entityId);if(t){this._queued.delete(i.entityId);const s=this._host.getCurves().find(t=>t.entityId===i.entityId&&t.visible);s&&this._pushCurve(e,s,t.position,t.value)}}else if("stopping"===t.phase&&t.automatic){!this._host.getCurves().some(t=>t.entityId===i.entityId)||i.conflicted||void 0===i.acknowledged||ti(e,i.entityId)!==i.acknowledged?(i.conflicted=!0,i.outcome="skipped",this._registry.changed(t)):this._registry.issue(t,i,i.before,!0,e)}"stopping"!==t.phase||[...t.lights.values()].some(t=>t.pending)||(t.automatic=!1,this._registry.changed(t))}finally{this._advancing=!1}}}beginMutation(t){const e=this._host.getStorageEntityId(),i=this._host.getHass();return e&&ii(i)&&(this._host.canDispatch?.()??1)&&!this.blocked?this._registry.beginMutation(e,[...new Set([...this._host.getCurves().map(t=>t.entityId),...t])]):null}reviewToken(){return JSON.stringify([ii(this._host.getHass()),this._host.canDispatch?.()??!0,ei(this._host.getHass()),this._host.getStorageEntityId(),this._host.getConfigEntryId?.(),this._host.getCurves().map(t=>t.entityId).sort(),this.sessions.map(t=>[t.id,t.revision,[...t.lights.values()].map(t=>[t.entityId,ti(this._host.getHass(),t.entityId)])])])}keepCurrent(t){if(!ii(this._host.getHass())||!(this._host.canDispatch?.()??1)||t!==this.reviewToken())return!1;if(this.otherWatching&&!this.reviewSessions.some(t=>"settled"!==t.phase))return!1;for(const t of this.reviewSessions)"settled"!==t.phase&&this._registry.abandon(t);return!0}restoreSelected(t,e){if(t!==this.reviewToken())return!1;const i=this.reviewSessions.filter(t=>"needs-review"===t.phase),s=this._host.getHass();if(!ii(s)||i.some(t=>!this._authorized(t)))return!1;const r=[];for(const t of i)for(const i of t.lights.values())if(e.includes(i.entityId)){if(i.pending||i.disposition||null===ti(s,i.entityId)||!this._host.getCurves().some(t=>t.entityId===i.entityId))return!1;r.push([t,i])}if(r.length!==new Set(e).size)return!1;for(const[t,e]of r)t.automatic=!1,this._registry.issue(t,e,e.before,!0,s);return!0}refresh(t=!1){this._active&&(null===this._host.getScrubberPosition()&&this._host.setScrubberPosition(50),this.previewLights(this._host.getScrubberPosition()??50,t))}previewLights(t,e=!1){this._schedule({position:t,entityId:null},e)}previewSingleLight(t,e,i=!1,s){this._schedule({position:e,entityId:t,value:s},i)}_schedule(t,e){const i=this._host.getHass();if(!this._active||!i)return;this._pending=t,e&&(this.lastPreviewTime=0,this._rafPending=!1,this._frameGeneration++,null===t.entityId?this._lastBrightness.clear():this._lastBrightness.delete(t.entityId),this._clearTrailingTimer());const s=Date.now()-this.lastPreviewTime;if(s<this._intervalMs)return void(this._trailingTimer||(this._trailingTimer=setTimeout(()=>{this._trailingTimer=null,null!==this._pending&&this._schedule(this._pending,!1)},this._intervalMs-s)));if(this._rafPending)return;this._clearTrailingTimer(),this._rafPending=!0;const r=this._frameGeneration;requestAnimationFrame(()=>{if(r!==this._frameGeneration)return;this._rafPending=!1;const e=this._host.getHass();if(!this._active||!e)return;this.lastPreviewTime=Date.now();const i=this._pending??t,s=this._session;if(!s||!this._authorized(s))return void this.disconnect();const n=this._host.getCurves().filter(t=>t.visible&&(null===i.entityId||t.entityId===i.entityId)&&null!==ti(e,t.entityId));if(!this._registry.reserve(s,n.map(t=>t.entityId)))return this.admissionIssue=mt.restoration.overlap,this._registry.stop(s,!1),this._fence(),void this._host.restorationChanged?.();if(null===i.entityId)for(const t of this._host.getCurves())t.visible&&this._pushCurve(e,t,i.position);else{const t=this._host.getCurves().find(t=>t.entityId===i.entityId);t&&t.visible&&this._pushCurve(e,t,i.position,i.value)}})}_pushCurve(t,e,i,s){const r=this._session,n=ti(t,e.entityId);if(!(r&&this._active&&this._authorized(r)&&null!==n&&this._host.getCurves().some(t=>t.entityId===e.entityId&&t.visible)))return;let o=r.lights.get(e.entityId);if(o?.conflicted)return;if(o?.pending)return void this._queued.set(e.entityId,{curve:e,position:i,value:s});const a=Math.max(0,Math.min(100,s??Rt(e.controlPoints,i))),l=Math.round(a/100*255),h=0===l?"off":l;this._lastBrightness.get(e.entityId)!==h&&(o||(o={entityId:e.entityId,name:e.friendlyName,before:n,target:h,outcome:"preview-pending",pending:!1,disposition:!1,conflicted:!1,operation:0},r.lights.set(e.entityId,o)),this._lastBrightness.set(e.entityId,h),this._registry.issue(r,o,h,!1,t))}_clearTrailingTimer(){this._trailingTimer&&(clearTimeout(this._trailingTimer),this._trailingTimer=null)}}const ai=["dim_accent","late_starter","early_starter"];class li{constructor(t){this._host=t,this._phase="inactive",this._firstRun=!1,this._shimmerStarted=!1,this._shimmerActive=!1,this._shimmerTimer=null,this._target=null,this._onInteraction=t=>{t.isTrusted&&this.interrupt()},this._onVisibilityChange=()=>{"visible"!==document.visibilityState?this.stopShimmer():this.maybeStartShimmer()}}get phase(){return this._phase}configure(t,e){const i=this._firstRun;this._firstRun=t,e?(this.stopShimmer(),this._shimmerStarted=!1,this._setPhase(t?"choose_shape":"inactive")):t&&!i&&"inactive"===this._phase&&(this._setPhase("choose_shape"),this._shimmerStarted=!1,this.maybeStartShimmer())}connect(t){this._target!==t&&(this._target&&this.disconnect(),this._target=t,t.addEventListener("pointerdown",this._onInteraction,!0),t.addEventListener("keydown",this._onInteraction,!0),t.addEventListener("focusin",this._onInteraction,!0),document.addEventListener("visibilitychange",this._onVisibilityChange))}disconnect(){this.stopShimmer(),this._target&&(this._target.removeEventListener("pointerdown",this._onInteraction,!0),this._target.removeEventListener("keydown",this._onInteraction,!0),this._target.removeEventListener("focusin",this._onInteraction,!0),document.removeEventListener("visibilitychange",this._onVisibilityChange),this._target=null)}maybeStartShimmer(){if(!this._target||!this._firstRun||this._shimmerStarted||"choose_shape"!==this._phase||!this._host.isReady()||"visible"!==document.visibilityState||Wt())return;const t=ai.map(t=>ft.find(e=>e.id===t)).filter(t=>void 0!==t);if(0===t.length)return;this._shimmerStarted=!0,this._shimmerActive=!0;let e=0;const i=()=>{if(this._shimmerActive){if(e>=t.length)return this._shimmerActive=!1,this._shimmerTimer=null,void this._host.clearTrial();this._host.setTrial(t[e++]),this._shimmerTimer=window.setTimeout(i,1350)}};i()}stopShimmer(){null!==this._shimmerTimer&&(window.clearTimeout(this._shimmerTimer),this._shimmerTimer=null),this._shimmerActive&&(this._shimmerActive=!1,this._host.clearTrial())}interrupt(){this._shimmerStarted=!0,this.stopShimmer()}toggle(t){"inactive"!==this._phase?this.dismiss():this._setPhase(t?"ready_to_save":"choose_shape")}dismiss(){this.stopShimmer(),this._setPhase("inactive")}afterEdit(){this.stopShimmer(),"inactive"!==this._phase&&this._setPhase("ready_to_save")}afterClean(){"ready_to_save"===this._phase&&this._setPhase("choose_shape")}afterSave(){"ready_to_save"===this._phase&&(this.stopShimmer(),this._setPhase("complete"))}_setPhase(t){this._phase!==t&&(this._phase=t,this._host.requestUpdate())}}function hi(t){return`${t} light${1===t?"":"s"}`}function di(t){return[...t].sort((t,e)=>t.lightener-e.lightener).map(t=>`${t.lightener}:${t.target}`).join("|")}function ci(t,e){if(!t.length)return null;const i=t.filter(t=>t.visible),s=t.length;if(!i.length)return{primary:"All lights are hidden",secondary:"Show a light in the list to bring its shape back.",visibleCount:0,totalCount:s,shapeCount:0,largestShapeCount:0};const r=function(t){const e=new Map;for(const i of t){const t=di(i.controlPoints),s=e.get(t)??[];s.push(i),e.set(t,s)}return e}(i),n=function(t){let e=[];for(const i of t.values())i.length>e.length&&(e=i);return e}(r),o=r.size,a=s-i.length,l=a>0?` ${a} hidden light${1===a?"":"s"}.`:"";if(e){const t=i.find(t=>t.entityId===e);if(t){const e=r.get(di(t.controlPoints))??[t],a=Math.max(0,e.length-1);return{primary:`Shaping ${t.friendlyName}`,secondary:a>0?`${hi(a)} still share${1===a?"s":""} this shape.${l}`:`This light has its own shape.${l}`,visibleCount:i.length,totalCount:s,shapeCount:o,largestShapeCount:n.length}}}if(1===o&&i.length>1){return{primary:!!(h=n[0]?.controlPoints??[]).length&&h.every(t=>t.lightener===t.target)?`${hi(i.length)} match the group brightness`:`${hi(i.length)} share one brightness shape`,secondary:`Pick a light to give it its own shape.${l}`,visibleCount:i.length,totalCount:s,shapeCount:o,largestShapeCount:n.length}}var h;return o===i.length?{primary:`${hi(i.length)}, ${o} separate shapes`,secondary:`Pick a light to focus its shape.${l}`,visibleCount:i.length,totalCount:s,shapeCount:o,largestShapeCount:n.length}:{primary:`${hi(i.length)}, ${o} brightness shapes`,secondary:`${hi(n.length)} share the most common shape.${l}`,visibleCount:i.length,totalCount:s,shapeCount:o,largestShapeCount:n.length}}const pi=a`(max-width: ${o(500)}px)`,ui=520,_i=Number(746.4516129032259.toFixed(2)),vi=a`
  @property --curve-graph-max-height {
    syntax: '<length-percentage>';
    inherits: true;
    initial-value: ${ui}px;
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
    --curve-stack-default-max-width: ${_i}px;
    container: lightener-card-shell / inline-size;
    display: block;
    font-family: var(
      --mdc-typography-body1-font-family,
      var(--paper-font-body1_-_font-family, 'Roboto', sans-serif)
    );
    height: fit-content;
  }
  .card {
    --_graph-panel-padding: 0px;
    /* Resolve the cap and padding together here: inherited computed custom
         properties would otherwise retain the wider padding in compact cards.
         The registered graph-height property preserves invalid-value fallback. */
    --curve-stack-max-width: calc(
      var(--curve-graph-max-height, ${ui}px) * ${Ct/St} + 2 *
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
  /* The sidebar page supplies the surface and spacing. */
  .card.embedded {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .header > h2 {
    flex: 1 1 160px;
  }
  .header > .editor-help {
    margin-left: auto;
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .workspace {
    display: grid;
    gap: 8px;
    /* Keep ordinary editor layers below HA chrome, without trapping the
       sibling membership dialog or changing fixed-position geometry. */
    isolation: isolate;
  }
  .editor-column {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }
  .main-stack,
  .side-rail,
  .status-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .main-stack {
    /* The graph and its room control share a width cap. The plot transform
         also sets the Room bar's insets when a custom height letterboxes the SVG. */
    width: 100%;
    max-width: min(100%, var(--curve-stack-max-width));
    margin-inline: auto;
    gap: 4px;
  }
  .side-rail {
    gap: 10px;
  }
  /* One line names the light being shaped and clears the selection. */
  .context-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    min-width: 0;
  }
  .context-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-lg);
    font-weight: 550;
  }
  .context-name.all {
    color: var(--secondary-text);
    font-size: var(--text-md);
    font-weight: 500;
  }
  .context-clear {
    flex: none;
    min-height: 44px;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--secondary-text);
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .context-clear:hover {
    background: color-mix(in srgb, var(--secondary-text) 12%, transparent);
    color: var(--text-color);
  }
  .context-clear:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  /* Show me how: the example's guidance takes the same line. */
  .canvas-guidance {
    justify-content: flex-start;
    gap: 4px;
  }
  .canvas-guidance-text {
    flex: 1;
    min-width: 0;
    margin-right: 4px;
    color: var(--secondary-text);
    font-size: var(--text-sm);
    line-height: 1.4;
  }
  .canvas-guidance-action {
    flex: none;
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 550;
    cursor: pointer;
  }
  .canvas-guidance-action:hover {
    background: color-mix(in srgb, var(--secondary-text) 12%, transparent);
  }
  .canvas-guidance-action:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .graph-panel {
    container: lightener-graph-panel / inline-size;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--_graph-panel-padding);
    background: transparent;
  }
  .control-slot {
    min-width: 0;
  }
  .control-dock {
    width: 100%;
    max-width: min(100%, var(--curve-stack-max-width));
    margin-inline: auto;
  }
  .room-surface {
    padding: 0 0 14px;
  }
  .room-surface:empty {
    display: none;
  }
  /* Watch, status and Undo, Cancel and Save, directly under Room brightness. */
  .footer-slot {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    padding-top: 10px;
    border-top: 1px solid var(--divider);
  }
  .footer-slot[data-overlay] {
    position: fixed;
    left: var(--curve-footer-overlay-left, 0px);
    right: auto;
    bottom: var(--curve-footer-overlay-bottom, env(safe-area-inset-bottom, 0px));
    width: var(--curve-footer-overlay-width, 100vw);
    z-index: 10;
    padding-bottom: 8px;
    background: var(--card-bg);
    background: color-mix(in srgb, var(--card-bg) 88%, transparent);
    backdrop-filter: blur(14px);
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
    animation: invitation-appear ${Vt.cueFade}ms ease-out both;
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
  .card .shape-chip.invitation-chip {
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
  /* Shapes on the left and one quiet line beside them. The fixed row keeps
       the graph still while chips, trials and tips come and go. */
  .graph-workbench {
    display: grid;
    grid-template-columns: minmax(0, min(300px, 50%)) minmax(0, 1fr);
    grid-template-rows: 44px;
    column-gap: 16px;
    align-items: center;
    min-width: 0;
  }
  .graph-workbench > .graph-insight,
  .graph-workbench > .coach-prompt {
    grid-column: 2;
    grid-row: 1;
  }
  /* With no light selected, the line uses the whole row. */
  .graph-workbench:has(.shape-chip-reserve) > .graph-insight,
  .graph-workbench:has(.shape-chip-reserve) > .coach-prompt {
    grid-column: 1 / -1;
  }
  /* The context line already names the selected light. */
  .graph-workbench.has-selection > .graph-insight:not(.trial):not(.invitation-insight) {
    visibility: hidden;
  }
  .graph-insight {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    min-height: 18px;
    color: var(--secondary-text);
  }
  .graph-insight-primary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-sm);
    font-weight: 450;
    line-height: 18px;
  }
  .graph-insight.trial .graph-insight-primary {
    color: var(--accent);
  }
  .graph-insight-secondary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--secondary-text);
    font-size: 11px;
    line-height: 1.25;
  }
  .shape-chip-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    width: 100%;
  }
  /* Empty stand-in shown when no light is selected: reserves the chip row's
       footprint so the graph never shifts as the chips appear and disappear.
       Kept as its own class, not .shape-chip-bar, so "is the chip bar
       present?" checks still mean the real, interactive chips. */
  .shape-chip-reserve {
    grid-column: 1;
    grid-row: 1;
    min-height: 44px;
    width: 100%;
    pointer-events: none;
  }
  .shape-chip {
    display: grid;
    grid-template-rows: 12px auto;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 44px;
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
  /* Wide card: graph, Room brightness and the action row on the left, the
       light list on the right. Narrow card: the same order stacked, with the
       list last. Both are container queries on the card's own width, so the
       Lovelace card and the sidebar panel match at the same size. */
  @container lightener-card (min-width: 860px) {
    .workspace {
      grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.9fr);
      align-items: start;
      column-gap: 32px;
    }
  }
  @container lightener-card (max-width: 859.98px) {
    .graph-panel {
      gap: 8px;
    }
    .context-name {
      font-size: var(--text-md);
    }
    /* The line sits above the chips; its row also fits a two-line tip. */
    .graph-workbench {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: 32px 44px;
      row-gap: 6px;
    }
    .graph-workbench > .graph-insight,
    .graph-workbench > .coach-prompt {
      grid-column: 1;
      grid-row: 1;
    }
    .shape-chip-bar,
    .shape-chip-reserve {
      grid-row: 2;
      width: min(100%, 300px);
    }
  }
  /* Tips share the workbench line: a title and up to two short lines. */
  .coach-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--primary-text-color, #212121);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
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
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    color: var(--secondary-text-color, #616161);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.2;
  }
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
    /* The graph column has no inset, so the target stays inside it. */
    margin: -8px 0 -8px auto;
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
  .context-line:focus {
    outline: none;
  }
  .context-line:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 8px;
  }
  @container lightener-card-shell ${pi} {
    .card {
      padding: 12px;
    }
    .header,
    .card.embedded .header {
      margin-bottom: 8px;
    }
    .side-rail,
    .status-stack {
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
`,gi=a`
  .preview-toggle-btn {
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    min-height: 32px;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: transparent;
    color: var(--secondary-text, var(--secondary-text-color, #616161));
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .preview-toggle-btn.active {
    color: var(--primary-color, #2563eb);
    border-color: currentColor;
  }
  .preview-toggle-btn:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  .preview-toggle-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .preview-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .preview-eye {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }
  @media ${pi} {
    .preview-toggle-btn {
      min-height: 44px;
    }
  }
`;function mi(t,e,i){return q`<button
    type="button"
    class="preview-toggle-btn ${t?"active":""}"
    aria-pressed=${t}
    aria-description=${mt.scrubber.watchGuidance}
    ?disabled=${e}
    @click=${i}
  >
    ${t?q`<span class="preview-live-dot" aria-hidden="true"></span>${mt.scrubber.watchingPrefix}
          · ${mt.scrubber.watchingRestore}`:q`<svg
            class="preview-eye"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" /></svg
          >${mt.scrubber.watchButton}`}
  </button>`}const fi=a`
  ${gi}
  /* Watch on the left, then save status, Undo, Cancel and Save. */
  .editor-commands {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 44px;
    font-family: inherit;
    color: var(--primary-text-color, #212121);
    --secondary-text: var(--secondary-text-color, #616161);
  }
  .editor-commands:focus {
    outline: none;
  }
  .editor-commands .preview-toggle-btn {
    box-sizing: border-box;
    flex: 0 1 auto;
    min-width: 0;
    min-height: 44px;
    padding: 8px 12px;
    gap: 6px;
    font-size: 13px;
    color: var(--primary-text-color, #212121);
  }
  .editor-commands .preview-toggle-btn.active {
    color: var(--primary-color, #2563eb);
  }
  .editor-commands .preview-live-dot {
    flex: 0 0 6px;
  }
  .editor-commands .command-status {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 12px;
    line-height: 1.25;
    text-align: right;
  }
  .editor-commands .command-status [role='alert'] {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    color: var(--error-color, #db4437);
  }
  .editor-commands .command-status [role='status'] {
    color: var(--secondary-text);
  }
  .editor-commands .command-retry {
    flex: 0 0 auto;
    white-space: nowrap;
    font: inherit;
    color: var(--primary-color, #2563eb);
    background: transparent;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
    padding: 4px;
    min-height: 44px;
  }
  .editor-commands curve-footer {
    flex: 0 0 auto;
  }
  .editor-commands button:focus-visible,
  .editor-help button:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  /* Narrow: Watch and the status share a line; the edit commands take the
     next, with Undo apart from Cancel and Save. */
  @container lightener-card (max-width: 859.98px) {
    .editor-commands .preview-toggle-btn:not(.active) {
      padding-inline: 0;
      border-color: transparent;
    }
    .editor-commands curve-footer {
      flex: 1 1 100%;
    }
  }
  @media ${pi} {
    .editor-commands .preview-toggle-btn {
      font-size: 14px;
    }
  }
  .editor-help {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    min-height: 44px;
  }
  .editor-help:focus {
    outline: none;
  }
  .editor-help .coach-help,
  .editor-help .invitation-replay {
    flex: 0 0 44px;
    box-sizing: border-box;
    width: 44px;
    min-width: 44px;
    height: 44px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 50%;
    font: inherit;
    color: var(--secondary-text-color, #616161);
    background: transparent;
    cursor: pointer;
    margin: 0;
  }
  .editor-help .coach-help:hover:not(:disabled),
  .editor-help .invitation-replay:hover:not(:disabled) {
    background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
  }
  .editor-help .coach-help:disabled,
  .editor-help .invitation-replay:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .editor-help .canvas-help {
    flex: 0 0 auto;
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }
  .editor-help .canvas-help:hover {
    background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
  }
`;const yi={phase:"idle"};class bi{constructor(t,e=8e3,i=2e3){this._host=t,this._confirmTimeoutMs=e,this._successDisplayMs=i,this._confirmTimer=null,this._successTimer=null,this._generation=0,this._resolve=null}currentGeneration(){return this._generation}arm(){const t=++this._generation;this._clearConfirmTimer(),this._settle("error");const e=new Promise(e=>{this._resolve=e,this._confirmTimer=setTimeout(()=>{this._confirmTimer=null,this._generation===t&&["saving","confirming"].includes(this._host.getSavePhase())&&this._host.dispatchSave({type:"save-error",message:"Save confirmation timed out."})},this._confirmTimeoutMs)});return{generation:t,settled:e}}confirm(t){"confirming"===this._host.getSavePhase()&&t===this._generation&&(this._host.dispatchSave({type:"save-confirmed"}),this._clearSuccessTimer(),this._successTimer=setTimeout(()=>{this._successTimer=null,"saved"===this._host.getSavePhase()&&this._host.dispatchSave({type:"save-clear"})},this._successDisplayMs))}fail(t,e){["saving","confirming"].includes(this._host.getSavePhase())&&t===this._generation&&this._host.dispatchSave({type:"save-error",message:e})}onLeaveConfirming(t,e){this._clearConfirmTimer(),(e||"error"===t)&&this._settle("error"===t?"error":"confirmed")}settleError(){this._settle("error")}dispose(){this._clearSuccessTimer(),this._clearConfirmTimer(),this._settle("error")}_settle(t){const e=this._resolve;e&&(this._resolve=null,e(t))}_clearConfirmTimer(){this._confirmTimer&&(clearTimeout(this._confirmTimer),this._confirmTimer=null)}_clearSuccessTimer(){this._successTimer&&(clearTimeout(this._successTimer),this._successTimer=null)}}const wi={loaded:!1,loading:!1,loadError:null};function xi(t){return{...t,loaded:!1,loadedEntityId:void 0}}const Ii=2,$i=t=>(...e)=>({_$litDirective$:t,values:e});let ki=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};const{I:Ci}=at,Si=t=>t,Ei=()=>document.createComment(""),Pi=(t,e,i)=>{const s=t._$AA.parentNode,r=void 0===e?t._$AB:e._$AA;if(void 0===i){const e=s.insertBefore(Ei(),r),n=s.insertBefore(Ei(),r);i=new Ci(e,n,t,t.options)}else{const e=i._$AB.nextSibling,n=i._$AM,o=n!==t;if(o){let e;i._$AQ?.(t),i._$AM=t,void 0!==i._$AP&&(e=t._$AU)!==n._$AU&&i._$AP(e)}if(e!==r||o){let t=i._$AA;for(;t!==e;){const e=Si(t).nextSibling;Si(s).insertBefore(t,r),t=e}}}return i},Ti=(t,e,i=t)=>(t._$AI(e,i),t),Ai={},Ri=(t,e=Ai)=>t._$AH=e,Li=t=>{t._$AR(),t._$AA.remove()},Mi=$i(class extends ki{constructor(){super(...arguments),this.key=K}render(t,e){return this.key=t,e}update(t,[e,i]){return e!==this.key&&(Ri(t),this.key=e),i}});let Di=0;const Oi={diag:[0,100],floor:[0,0],ceil:[100,100]};function Gi(t,e,i){return null===i?Ft[t%Ft.length]:e===i?"":Ft[t%(Ft.length-1)+1]}function Fi(t,e){return j`
    <defs>
      <linearGradient id="${t}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${e}" stop-opacity="0.45" />
        <stop offset="100%" stop-color="${e}" stop-opacity="0.08" />
      </linearGradient>
    </defs>`}function Ni(t){return Array.from({length:101},(e,i)=>Lt(t,100*i/100))}function Ui(t){return t.from.map((e,i)=>e+(t.to[i]-e)*t.progress)}class Hi extends ct{constructor(){super(),this.curves=[],this.selectedCurveId=null,this.entityId=null,this.readOnly=!1,this.scrubberPosition=null,this.showXAxisLabel=!1,this.previewCurve=null,this.exampleEntityId=null,this.exampleInstruction=null,this.exampleCueAnimating=!1,this.joy=zt,this.curveFrame=null,this.drawIn=null,this.drawOut=null,this.hoveredCurveId=null,this._dragCurveIdx=-1,this._dragPointIdx=-1,this._hoveredPoint=null,this._focusedPoint=null,this._isMobile=!1,this._labelScale=1,this._settle=null,this._flash=null,this._reveal=null,this._previewMorph=null,this._uid=(Di++).toString(36),this._mql=null,this._wasDragging=!1,this._longPressTimer=null,this._longPressFired=!1,this._touchTapStart=null,this._lastTouchTap=null,this._suppressDblClickUntil=0,this._dragStartTarget=null,this._dragPointerId=null,this._pointPress=null,this._dragInput="mouse",this._dragReleaseTimer=null,this._cancelSettleLoop=null,this._heldLines=[],this._flashToken=0,this._flashTimer=null,this._cancelDrawInLoop=null,this._drawInObserver=null,this._labelResizeObserver=null,this._pendingDrawInToken=null,this._drawInStartTimer=null,this._lastDrawInToken=-1,this._cancelPreviewMorphLoop=null,this._previewShown=null,this._settlePoint=null,this._onDrawInIntersection=t=>{const e=t.find(t=>t.target===this);if(!e)return;const i=e.isIntersecting&&e.intersectionRatio>=.5,s=this._pendingDrawInToken;if(i&&null!==s&&this.drawIn?.token===s&&!1!==this.drawIn.ready)this._scheduleDrawInStart(s);else if(i||null===s){if(!i&&this._reveal&&null===s){const t=this._reveal.token;this._waitForDrawInVisibility(t),this.dispatchEvent(new CustomEvent("draw-in-waiting",{detail:{token:t},bubbles:!0,composed:!0}))}}else this._cancelDrawInStart()},this._onMqlChange=t=>{this._isMobile=t.matches},this._onWindowBlur=()=>{this.cancelInteraction()},this._updateLabelScale=()=>{const t=this._svgRef?.getBoundingClientRect();if(!t||t.width<=0||t.height<=0)return;const e=Math.min(t.width/Ct,t.height/St);this._labelScale=Math.min(1,320/St/e)};const t=()=>{this._stopSettle(),this._stopFlash()};this.addEventListener("pointerdown",t,!0),this.addEventListener("keydown",t,!0)}_interaction(t,e){this.dispatchEvent(new CustomEvent("graph-interaction",{detail:{phase:t,input:e},bubbles:!0,composed:!0}))}get interactionActive(){return null!==this._dragPointerId||null!==this._touchTapStart}get _hoverTarget(){const t=this.hoveredCurveId;return!t||this.interactionActive||this._dragCurveIdx>=0?null:this.curves.some(e=>e.entityId===t&&e.visible)?t:null}focusPoint(t,e){const i=this.curves.findIndex(e=>e.entityId===t),s=this.curves[i]?.controlPoints.findIndex(t=>t.lightener===e)??-1,r=this.renderRoot.querySelector(`.hit-circle[data-curve="${i}"][data-point="${s}"]`);return!!r&&(r.focus({preventScroll:!0}),!0)}cancelInteraction(){const t=this._finishPointPress("cancel"),e=this._touchTapStart?.pointerId;this._dragCurveIdx=-1,this._dragPointIdx=-1,this._dragPointerId=null,this._pointPress=null,this._dragStartTarget=null,this._heldLines=[],this._clearLongPress(),this._longPressFired=!1,this._touchTapStart=null,this._lastTouchTap=null,this._suppressDblClickUntil=0,this._wasDragging=!1,null!==this._dragReleaseTimer&&clearTimeout(this._dragReleaseTimer),this._dragReleaseTimer=null,this._hoveredPoint=null,this._focusedPoint=null,this._stopSettle(),this._stopFlash();for(const t of[this._svgRef,...this.renderRoot.querySelectorAll("rect")])null!=e&&t?.hasPointerCapture?.(e)&&t.releasePointerCapture(e);t||null==e||this._interaction("cancel",this._dragInput)}_getSvgCoords(t){const e=this._svgRef;if(!e)return null;const i=e.getScreenCTM();if(!i)return null;let s;try{s=i.inverse()}catch{return null}if(!s||isNaN(s.a))return null;const r=e.createSVGPoint();r.x=t.clientX,r.y=t.clientY;const n=r.matrixTransform(s);return{x:(a=n.x,(a-xt)/$t*100),y:(o=n.y,100*(1-(o-It)/kt))};var o,a}_dispatchPointAddFromEvent(t){const e=this._getSvgCoords(t);if(!e)return!1;const i=Math.round(Tt(e.x,1,100)),s=Math.round(Tt(e.y,0,100));return this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-add",{detail:{lightener:i,target:s,entityId:this.selectedCurveId},bubbles:!0,composed:!0})),!0}_isNonMousePointer(t){return""!==t.pointerType&&"mouse"!==t.pointerType}_touchMoveDistance(t,e){return Math.hypot(e.clientX-t.clientX,e.clientY-t.clientY)}_isCurveInteractive(t){return!this.readOnly&&(null===this.selectedCurveId||this.curves[t]?.entityId===this.selectedCurveId)}_focusCurve(t){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_onPointFocus(t,e){this._interaction("start","keyboard");const i=this.curves[t];i&&(this._focusedPoint={curve:t,point:e},this._hoveredPoint={curve:t,point:e},this._focusCurve(i.entityId))}_onPointBlur(t,e){(t===this._dragCurveIdx&&e===this._dragPointIdx||this._longPressFired&&this.curves[t]?.entityId===this._pointPress?.entityId)&&this._finishPointPress("cancel"),this._focusedPoint?.curve===t&&this._focusedPoint?.point===e&&(this._focusedPoint=null),this._hoveredPoint?.curve===t&&this._hoveredPoint?.point===e&&(this._hoveredPoint=null)}_dispatchKeyboardMove(t,e,i,s){const r=this._pointPress,n=this.curves[t]?.controlPoints[e];r&&n&&(n.lightener!==i||n.target!==s)&&(r.keyboardEdited=!0,this._clearLongPress()),this.joy.diagonal&&t===this._dragCurveIdx&&e===this._dragPointIdx&&(this._heldLines=te(e,i,s,this._heldLines).held),this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:t,pointIndex:e,lightener:i,target:s},bubbles:!0,composed:!0})),r||this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:t,pointIndex:e},bubbles:!0,composed:!0}))}_getKeyboardInsertPoint(t,e){const i=t.controlPoints[e],s=t.controlPoints[e+1],r=t.controlPoints[e-1];return s&&s.lightener-i.lightener>1?{lightener:Math.round((i.lightener+s.lightener)/2),target:Math.round((i.target+s.target)/2)}:r&&i.lightener-r.lightener>1?{lightener:Math.round((r.lightener+i.lightener)/2),target:Math.round((r.target+i.target)/2)}:null}_onPointKeyDown(t,e,i){this._interaction("start","keyboard");const s=this.curves[e],r=s?.controlPoints[i];if(!s||!r)return;if(this.selectedCurveId!==s.entityId&&this._focusCurve(s.entityId),0===i&&("ArrowRight"===t.key||"ArrowLeft"===t.key))return;const n=t.shiftKey?10:1,o=i>0?s.controlPoints[i-1].lightener+1:r.lightener,a=i<s.controlPoints.length-1?s.controlPoints[i+1].lightener-1:100;if("ArrowRight"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.min(a,r.lightener+n),r.target);if("ArrowLeft"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.max(o,r.lightener-n),r.target);if("ArrowUp"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,r.lightener,Math.min(100,r.target+n));if("ArrowDown"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,r.lightener,Math.max(0,r.target-n));if("Enter"===t.key){const n=this._getKeyboardInsertPoint(s,i);if(!n)return;t.preventDefault(),this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-add",{detail:{entityId:s.entityId,lightener:n.lightener,target:n.target},bubbles:!0,composed:!0}));const o=i+(n.lightener<r.lightener?1:0);return void this._refocusHitCircle(e,o).catch(()=>{})}(" "===t.key||"Delete"===t.key||"Backspace"===t.key)&&i>0&&s.controlPoints.length>2&&(t.preventDefault(),this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})),this._refocusHitCircle(e,Math.max(1,i-1)).catch(()=>{}))}async _refocusHitCircle(t,e){await Promise.resolve(),await this.updateComplete;const i=this.renderRoot.querySelector(`.hit-circle[data-curve="${t}"][data-point="${e}"]`);i&&i.focus()}_onPointerDown(t,e,i){if(0!==t.button)return;if(null!==this._dragPointerId)return;if(!this._isCurveInteractive(e))return;const s=this.curves[e];s?.visible&&s.controlPoints[i]&&(this._dragInput=t.pointerType||"mouse",this._interaction("start",this._dragInput),t.preventDefault(),this._longPressFired=!1,this._dragStartTarget=this.curves[e]?.controlPoints[i]?.target??null,this._dragPointerId=t.pointerId,this._pointPress={clientX:t.clientX,clientY:t.clientY,entityId:s.entityId,groupId:this.entityId,dragging:!1,keyboardEdited:!1},this._heldLines=[],this._clearLongPress(),i>0&&(this._longPressTimer=setTimeout(()=>{this._longPressTimer=null,this._pointPressIsCurrent()?(this._longPressFired=!0,this._dragCurveIdx=-1,this._dragPointIdx=-1,this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0}))):this._finishPointPress("cancel")},500)),this._svgRef?.setPointerCapture(t.pointerId),this._dragCurveIdx=e,this._dragPointIdx=i)}_clearLongPress(){this._longPressTimer&&(clearTimeout(this._longPressTimer),this._longPressTimer=null)}_onPointerMove(t){const e=this._pointPress;if(!e||this._dragCurveIdx<0||t.pointerId!==this._dragPointerId)return;if(!this._pointPressIsCurrent())return void this._finishPointPress("cancel");t.preventDefault();const i=Math.hypot(t.clientX-e.clientX,t.clientY-e.clientY);if(!e.dragging){if(i<6)return;this._clearLongPress(),e.dragging=!0}const s=this._getSvgCoords(t);if(!s)return;const r=this.curves[this._dragCurveIdx],n=r?.controlPoints??[],o=this._dragPointIdx>0?n[this._dragPointIdx-1].lightener+1:1,a=this._dragPointIdx<n.length-1?n[this._dragPointIdx+1].lightener-1:100,l=0===this._dragPointIdx?this.curves[this._dragCurveIdx]?.controlPoints[0]?.lightener??0:Math.round(Tt(s.x,o,a)),h=Tt(s.y,0,100),d=this.joy.diagonal?function(t,e,i,s){if(!(s>0&&Number.isFinite(i)))return null;const r=Math.min(9.2/s,3.45);let n=null,o=1/0;for(const s of t>0?[e,0,100]:[0,100]){const t=Math.abs(i-s);t<=r&&t<o&&(n=s,o=t)}return n}(this._dragPointIdx,l,h,this._pxPerStep()):null,c=d??Math.round(h);this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx,lightener:l,target:c},bubbles:!0,composed:!0})),this.joy.diagonal&&!this.readOnly&&this._noteDiagonalHit(l,c)}_onPointerUp(t){if(null===this._dragPointerId||t.pointerId!==this._dragPointerId)return;t.preventDefault();const e=this._pointPress,i="pointerup"===t.type,s=i&&null!==e&&!e.dragging&&!e.keyboardEdited&&!this._longPressFired&&this._pointPressIsCurrent()&&Math.hypot(t.clientX-e.clientX,t.clientY-e.clientY)<6;this._finishPointPress(i?"end":"cancel",i),s&&e&&this._focusCurve(e.entityId)}_pxPerStep(){const t=this._svgRef?.getScreenCTM?.()?.d??0;return Math.abs(t)*(Pt(0)-Pt(1))||0}_pointPressIsCurrent(){return null!==this._pointPress&&this._pointPress.groupId===this.entityId&&this.curves[this._dragCurveIdx]?.entityId===this._pointPress.entityId&&!0===this.curves[this._dragCurveIdx]?.visible&&void 0!==this.curves[this._dragCurveIdx]?.controlPoints[this._dragPointIdx]&&this._isCurveInteractive(this._dragCurveIdx)}_finishPointPress(t,e=!1){if(null===this._dragPointerId)return!1;const i=this._dragPointerId,s=this._dragCurveIdx,r=this._dragPointIdx,n=this._dragStartTarget,o=!0===this._pointPress?.dragging&&!this._longPressFired,a=o||!0===this._pointPress?.keyboardEdited;return this._clearLongPress(),this._dragCurveIdx=-1,this._dragPointIdx=-1,this._dragPointerId=null,this._pointPress=null,this._dragStartTarget=null,this._longPressFired=!1,this._svgRef?.hasPointerCapture?.(i)&&this._svgRef.releasePointerCapture(i),a&&(this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:s,pointIndex:r},bubbles:!0,composed:!0})),this._wasDragging=!0,null!==this._dragReleaseTimer&&clearTimeout(this._dragReleaseTimer),this._dragReleaseTimer=setTimeout(()=>{this._wasDragging=!1,this._dragReleaseTimer=null},400)),this._interaction(t,this._dragInput),e&&o&&this._startSettle(s,r,n),!0}_startSettle(t,e,i){if(!Yt(this.joy,"settle"))return;const s=this.curves[t],r=s?.controlPoints[e];if(null===i||!s||!r)return;const n=Math.sign(r.target-i);0!==n&&(this._stopSettle(),this._settlePoint={entityId:s.entityId,curve:t,point:e,lightener:r.lightener,target:r.target},this._cancelSettleLoop=Jt(250,i=>{Wt()?this._stopSettle():this._settle={curve:t,point:e,dy:Xt(i,n)}},()=>this._stopSettle()))}_settlePointUnchanged(){const t=this._settlePoint;if(!t)return!1;const e=this.curves[t.curve],i=e?.controlPoints[t.point];return e?.entityId===t.entityId&&i?.lightener===t.lightener&&i?.target===t.target}_noteDiagonalHit(t,e){const{held:i,landed:s}=te(this._dragPointIdx,t,e,this._heldLines);this._heldLines=i,s&&(Wt()||this._startFlash(s),"function"==typeof navigator.vibrate&&window.matchMedia?.("(pointer: coarse)").matches&&navigator.vibrate(5))}_startFlash(t){this._stopFlash(),this._flash={kind:t,token:++this._flashToken},this._flashTimer=setTimeout(()=>this._stopFlash(),400)}_stopFlash(){this._flashTimer&&clearTimeout(this._flashTimer),this._flashTimer=null,this._flash=null}_renderDiagonalFlash(){const t=this._flash;if(!t)return K;const[e,i]=Oi[t.kind];return Mi(t.token,j`<line class="diagonal-flash" x1=${Et(0)} y1=${Pt(e)}
        x2=${Et(100)} y2=${Pt(i)} pointer-events="none" />`)}_stopSettle(){this._cancelSettleLoop?.(),this._cancelSettleLoop=null,this._settlePoint=null,this._settle=null}_startDrawIn(t){this._stopDrawIn(),this._reveal={token:t,progress:0},this.dispatchEvent(new CustomEvent("draw-in-started",{detail:{token:t,pointCount:this._drawInPointCount()},bubbles:!0,composed:!0})),this._cancelDrawInLoop=Jt(qt,e=>{this._reveal={token:t,progress:Ut(e/qt)}},()=>{this._reveal={token:t,progress:1}})}_stopDrawIn(){this._cancelDrawInLoop?.(),this._cancelDrawInLoop=null,this._cancelDrawInStart(),this._pendingDrawInToken=null,this._reveal=null}_scheduleDrawInStart(t){null===this._drawInStartTimer&&(this._drawInStartTimer=setTimeout(()=>{this._drawInStartTimer=null,this._pendingDrawInToken===t&&this.drawIn?.token===t&&!1!==this.drawIn.ready&&this._startDrawIn(t)},200))}_cancelDrawInStart(){null!==this._drawInStartTimer&&clearTimeout(this._drawInStartTimer),this._drawInStartTimer=null}_waitForDrawInVisibility(t){this._stopDrawIn(),this._pendingDrawInToken=t,this._reveal={token:t,progress:0},!1!==this.drawIn?.ready&&(this._drawInObserver?(this._drawInObserver.unobserve(this),this._drawInObserver.observe(this)):this._scheduleDrawInStart(t))}_drawInPointCount(){return this.readOnly?0:this.curves.reduce((t,e,i)=>e.visible&&this.drawIn?.ids.has(e.entityId)&&this._isCurveInteractive(i)?e.controlPoints.reduce((t,e,i)=>null===this.scrubberPosition||e.lightener<=this.scrubberPosition?Math.max(t,i+1):t,t):t,0)}_revealFor(t){return this.drawIn?.ids.has(t.entityId)?this._reveal:null}_drawInClipId(t,e){return`draw-in-${this._uid}-${e}-${t}`}_drawInDotClipId(t,e){return`draw-in-dot-${this._uid}-${e}-${t}`}_drawInClipFor(t,e){const i=this._revealFor(t);return i?`url(#${this._drawInClipId(e,i.token)})`:K}_drawInDotClipFor(t,e){const i=this._revealFor(t);return i?`url(#${this._drawInDotClipId(e,i.token)})`:K}_onPointContextMenu(t,e,i){t.preventDefault(),t.stopPropagation(),this.readOnly||this._isCurveInteractive(e)&&0!==i&&(this._interaction("start","mouse"),this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})))}_onDblClick(t){this.readOnly||this._wasDragging||(performance.now()<this._suppressDblClickUntil?t.preventDefault():(this._interaction("start","mouse"),this._dispatchPointAddFromEvent(t)))}_onHitAreaPointerDown(t){this.readOnly||(this._interaction("start",t.pointerType||"mouse"),this._isNonMousePointer(t)&&(this._touchTapStart={pointerId:t.pointerId,pointerType:t.pointerType,clientX:t.clientX,clientY:t.clientY,startedAt:performance.now()},t.currentTarget.setPointerCapture?.(t.pointerId)))}_onHitAreaPointerUp(t){if(this.readOnly)return;if(!this._isNonMousePointer(t))return;const e=this._touchTapStart;if(this._touchTapStart=null,this._interaction("end",t.pointerType),!e||e.pointerId!==t.pointerId||e.pointerType!==t.pointerType)return;if(this._touchMoveDistance(e,t)>12)return void(this._lastTouchTap=null);const i=performance.now(),s=this._lastTouchTap;null!==s&&s.pointerType===t.pointerType&&i-s.startedAt<=350&&this._touchMoveDistance(s,t)<=12?(this._lastTouchTap=null,this._dispatchPointAddFromEvent(t)&&(t.preventDefault(),this._suppressDblClickUntil=i+450)):this._lastTouchTap={pointerId:t.pointerId,pointerType:t.pointerType,clientX:t.clientX,clientY:t.clientY,startedAt:i}}_onHitAreaPointerCancel(t){this._touchTapStart?.pointerId===t.pointerId&&(this._touchTapStart=null,this._interaction("cancel",t.pointerType))}_renderGrid(){return j`
      <defs>
        <clipPath id="graph-area-${this._uid}">
          <rect x="${14}" y="${-18}" width="${360}" height="${260}" />
        </clipPath>
        ${this.drawIn?this.curves.map((t,e)=>{const i=t.visible?this._revealFor(t):null;return i?(()=>{const t=354,s=null===this.scrubberPosition?t:Tt(Et(this.scrubberPosition),34,t),r=Math.min(t,s+(null===this.scrubberPosition?0:4)),n=Math.max(0,r-34)*i.progress,o=Math.max(0,t-s);return j`
                        <clipPath class="draw-in-clip" id="${this._drawInClipId(e,i.token)}" clipPathUnits="userSpaceOnUse">
                          <rect class="draw-in-reveal" x="${34}" y="0"
                            width="${n}" height="${St}" />
                          ${o>0?j`<rect class="draw-in-dim-span" x="${s}" y="0"
                                width="${o}" height="${St}" />`:K}
                        </clipPath>
                        <clipPath class="draw-in-dot-clip" id="${this._drawInDotClipId(e,i.token)}" clipPathUnits="userSpaceOnUse">
                          <rect x="${34}" y="0" width="${n}" height="${St}" />
                        </clipPath>`})():K}):K}
      </defs>

      <rect class="plot-frame"
        x="${xt}" y="${It}"
        width="${$t}" height="${kt}" />

      ${[0,25,50,75,100].map(t=>j`
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

      ${this.showXAxisLabel?j`<text class="axis-label x-axis-label" text-anchor="middle"
              x="${194}" y="${244}">${mt.scrubber.title}</text>`:K}
      <text class="axis-label" text-anchor="middle"
        transform="rotate(-90, 10, ${112})"
        x="10" y="${112}">${mt.graph.yAxisLabel}</text>
    `}_renderAxes(){return j`<g class="graph-axes" pointer-events="none">
      <line class="axis-line"
        x1="${xt}" y1="${Pt(0)}"
        x2="${344}" y2="${Pt(0)}" />
      <line class="axis-line"
        x1="${xt}" y1="${Pt(0)}"
        x2="${xt}" y2="${Pt(100)}" />
    </g>`}_renderCrossHair(t){if(this._dragCurveIdx<0)return K;const e=t.controlPoints[this._dragPointIdx];if(!e)return K;const i=Et(e.lightener),s=Pt(e.target);return j`
      <line class="crosshair"
        x1="${i}" y1="${s}"
        x2="${i}" y2="${Pt(0)}"
        stroke="${t.color}" opacity="0.5" />
      <line class="crosshair"
        x1="${i}" y1="${s}"
        x2="${xt}" y2="${s}"
        stroke="${t.color}" opacity="0.5" />
    `}_renderTooltip(t,e=t){const i=Et(e.lightener),s=Pt(e.target),r=`Group ${t.lightener}% -> Light ${t.target}%`,n=Math.ceil(4.9*r.length),o=Tt(i-n/2-2,xt,344-n-8),a=Math.max(16,s-16);return j`
      <rect class="tooltip-bg"
        x="${o}" y="${a-8}"
        width="${n+8}" height="14" />
      <text class="tooltip-text" text-anchor="start"
        x="${o+4}" y="${a+2}">${r}</text>
    `}_renderScrubberIndicator(){if(null===this.scrubberPosition)return K;const t=this.scrubberPosition,e=Et(t),i=e-(0===t?2:0),s=100===t?K:j`
      <rect class="scrubber-dim"
        x="${i}" y="${Pt(100)-2}"
        width="${Et(100)+2-i}" height="${204}"
        fill="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))"
        fill-opacity="0.93"
        pointer-events="none"
      />
    `,r=j`
      <line class="scrubber-line"
        x1="${e}" y1="${Pt(0)}"
        x2="${e}" y2="${Pt(100)}" />
    `,n=this.curves.map((i,s)=>{if(!i.visible)return K;const r=this._frameFor(i),n=Pt(r?Gt(r.pieces,t):Lt(i.controlPoints,t));return j`
          <circle
            class="scrubber-dot"
            clip-path="${this._drawInDotClipFor(i,s)}"
            cx="${e}" cy="${n}"
            r="${4}"
            fill="${i.color}"
            filter="url(#scrubber-glow-${i.color.replace("#","")}-${this._uid})"
            pointer-events="none"
          />
        `});return j`${s}${r}${n}`}_frameFor(t){return this.curveFrame?.entityId===t.entityId?this.curveFrame:null}_orderedCurves(){const t=this.selectedCurveId?this.curves.findIndex(t=>t.entityId===this.selectedCurveId):-1;return t>=0?[...this.curves.slice(0,t).map((t,e)=>({curve:t,idx:e})),...this.curves.slice(t+1).map((e,i)=>({curve:e,idx:t+1+i})),{curve:this.curves[t],idx:t}]:this.curves.map((t,e)=>({curve:t,idx:e}))}_renderCurvePaths(t,e){if(!t.visible||!t.controlPoints.length)return K;try{const i=t.entityId===this.selectedCurveId,s=null===this.selectedCurveId||i,r=this._dragCurveIdx===e,n=this._hoverTarget,o=n===t.entityId,a=n?o?1:.14:s?1:.2,l=o?1:n?.06:a,h=`curve-line ${i?"selected":""} ${o?"hovered":""}`,d=this._frameFor(t),c=bt(t.controlPoints),p=d?function(t){if(!t.length)return"";let e=`M${Et(t[0].x0)},${Pt(t[0].y[0])}`;for(const i of t){const t=(i.x1-i.x0)/3;e+=` C${Et(i.x0+t)},${Pt(i.y[1])} ${Et(i.x1-t)},${Pt(i.y[2])} ${Et(i.x1)},${Pt(i.y[3])}`}return e}(d.pieces):Dt(c.map(t=>({x:Et(t.lightener),y:Pt(t.target)}))),u=p+` L${Et(d?d.pieces[d.pieces.length-1]?.x1??100:c[c.length-1].lightener)},${Pt(0)}`+` L${Et(0)},${Pt(0)} Z`,_=`grad-${e}-${this._uid}`,v=Gi(e,t.entityId,this.selectedCurveId),g=i||o,m=this._drawInClipFor(t,e);return j`
        ${g?j`
              ${Fi(_,t.color)}
              <path
                class="curve-fill"
                clip-path="${m}"
                d="${u}"
                fill="url(#${_})"
                style="opacity: ${l}"
                pointer-events="none"
              />`:K}
        ${r?this._renderCrossHair(t):K}
        <path
          class="${h}"
          clip-path="${m}"
          d="${p}"
          stroke="${t.color}"
          stroke-dasharray="${v}"
          style="opacity: ${a}"
          pointer-events="none"
        />
      `}catch{return K}}_renderDrawOut(){const t=this.drawOut;if(!t||!Yt(this.joy,"draw_in"))return K;const e=new Set(this.curves.map(t=>t.entityId)),i=t.selectedCurveId;return Mi(t.token,j`<g class="draw-out" pointer-events="none">${t.curves.map(({curve:s,index:r})=>{if(e.has(s.entityId)||!s.controlPoints.length)return K;const n=s.entityId===i,o=Dt(bt(s.controlPoints).map(t=>({x:Et(t.lightener),y:Pt(t.target)}))),a=`draw-out-${t.token}-${r}-${this._uid}`;return j`
          ${n?j`${Fi(a,s.color)}
                <path d="${o} L${Et(100)},${Pt(0)} L${Et(0)},${Pt(0)} Z"
                  fill="url(#${a})" />`:K}
          <path
            class="curve-line ${n?"selected":""}"
            d="${o}"
            stroke="${s.color}"
            stroke-dasharray="${Gi(r,s.entityId,i)}"
            style="opacity: ${null===i||n?1:.2}"
          />`})}</g>`)}_renderCurvePoints(t,e){if(!t.visible||!t.controlPoints.length)return K;try{const i=this._isCurveInteractive(e);if(!(i&&!this.readOnly))return K;const s=this._dragCurveIdx===e,r=t.color+"33";let n=-1;s&&this._dragPointIdx>=0?n=this._dragPointIdx:this._hoveredPoint?.curve!==e&&this._focusedPoint?.curve!==e||(n=this._focusedPoint?.curve===e?this._focusedPoint.point:this._hoveredPoint?.point??-1);const o=t.controlPoints[n]??null,a=this._frameFor(t)?.knots??null,l=this._revealFor(t),h=this._hoverTarget;return j`
        ${t.controlPoints.map((i,n)=>{const o=null!==l&&(null===this.scrubberPosition||i.lightener<=this.scrubberPosition),d=a?.[n]??i,c=0===n,p=s&&this._dragPointIdx===n,u=this._hoveredPoint?.curve===e&&this._hoveredPoint?.point===n,_=null!==this.scrubberPosition&&i.lightener>this.scrubberPosition,v=this._focusedPoint?.curve===e&&this._focusedPoint?.point===n,g=null!==h&&h!==t.entityId&&!p&&!v?.16:_?.35:1,m=this._settle?.curve===e&&this._settle.point===n?this._settle.dy:0,f=function(t,e,i,s,r,n,o,a,l){const h=`--glow-color: ${l}; opacity: ${a}`,d=`${r} shape-${t}`;switch(t){case"circle":return j`<circle
        class="${d}"
        cx="${e}"
        cy="${i}"
        r="${s}"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`;case"square":{const t=1.15*s;return j`<rect
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
      />`}case"diamond":{const t=1.3*s;return j`<rect
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
      />`}case"triangle":{const t=1.15*s,r=1.3*s;return j`<polygon
        class="${d}"
        points="${e},${i-t} ${e-r},${i+.65*t} ${e+r},${i+.65*t}"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`}case"bar":{const t=2*s,r=.75*s;return j`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-r/2}"
        width="${t}"
        height="${r}"
        rx="1.5"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${h}"
        pointer-events="none"
      />`}default:return t}}(Nt[e%Nt.length],Et(d.lightener),Pt(d.target)+m,6,`control-point ${c?"origin":""} ${p?"dragging":""} ${u?"hovered":""} ${this._focusedPoint?.curve===e&&this._focusedPoint?.point===n?"focused":""}`,r,t.color,g,t.color);return j`
            <circle
              class="hit-circle ${c?"origin-hit":""}"
              data-curve="${e}"
              data-point="${n}"
              cx="${Et(d.lightener)}"
              cy="${Pt(d.target)}"
              r="${this._isMobile?28:22}"
              fill="transparent"
              pointer-events="all"
              tabindex="0"
              role="button"
              aria-describedby=${t.entityId===this.exampleEntityId?`example-${this._uid}`:K}
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
            ${o&&l?null!==this._pendingDrawInToken?j`<g class="marker-wait" visibility="hidden">${f}</g>`:Mi(`${l.token}:${t.entityId}:${n}`,j`<g class="marker-pop"
                    style="animation-delay: ${qt+40*n}ms">${f}</g>`):f}
          `})}
        ${null!==o?this._renderTooltip(o,a?.[n]??o):K}
      `}catch{return K}}willUpdate(t){this._pointPress&&(t.has("entityId")||t.has("readOnly")&&this.readOnly||!this._longPressFired&&!this._pointPressIsCurrent())&&this._finishPointPress("cancel"),t.has("entityId")&&this._stopDrawIn();const e=this.drawIn,i=null!==e&&this.isConnected&&Yt(this.joy,"draw_in"),s=null!==e&&(this._reveal?.token===e.token||this._pendingDrawInToken===e.token);if(e&&s&&i||this._stopDrawIn(),e&&e.token>this._lastDrawInToken?(this._lastDrawInToken=e.token,i&&this._waitForDrawInVisibility(e.token)):i&&t.has("drawIn")&&this._pendingDrawInToken===e.token&&!1!==e.ready&&this._waitForDrawInVisibility(e.token),t.has("joy")&&!this.joy.diagonal&&this._stopFlash(),(t.has("previewCurve")||t.has("joy"))&&this._syncPreviewMorph(),!this._cancelSettleLoop)return;const r=t.has("joy")&&!this.joy.settle,n=t.has("curves")&&!this._settlePointUnchanged();(r||n)&&this._stopSettle()}connectedCallback(){super.connectedCallback(),this._mql=window.matchMedia("(max-width: 500px)"),this._isMobile=this._mql.matches,this._mql.addEventListener("change",this._onMqlChange),window.addEventListener("blur",this._onWindowBlur),this.updateComplete.then(()=>{this.isConnected&&!this._labelResizeObserver&&this._svgRef&&(this._updateLabelScale(),"undefined"!=typeof ResizeObserver&&(this._labelResizeObserver=new ResizeObserver(this._updateLabelScale),this._labelResizeObserver.observe(this._svgRef)))}),"undefined"!=typeof IntersectionObserver&&(this._drawInObserver=new IntersectionObserver(this._onDrawInIntersection,{threshold:.5}),this._drawInObserver.observe(this))}disconnectedCallback(){this.cancelInteraction(),super.disconnectedCallback(),this._stopDrawIn(),this._stopPreviewMorph(),this._drawInObserver?.disconnect(),this._drawInObserver=null,this._labelResizeObserver?.disconnect(),this._labelResizeObserver=null,window.removeEventListener("blur",this._onWindowBlur),this._mql?.removeEventListener("change",this._onMqlChange),this._mql=null}_getSvgDescription(){const t=this.curves.filter(t=>t.visible);if(!t.length)return"No curves displayed";const e=t.map(t=>{const e=t.controlPoints.reduce((t,e)=>Number.isFinite(e.target)?Math.max(t,e.target):t,0);return`${t.friendlyName} (${t.controlPoints.length} points, max ${e}%)`});return`${t.length} curve${1===t.length?"":"s"}: ${e.join(", ")}`}_renderExampleInstruction(){const t=this.curves.findIndex(t=>t.entityId===this.exampleEntityId),e=this.curves[t];if(!e||!this.exampleInstruction)return K;const i=e.controlPoints.reduce((t,e)=>Math.abs(e.lightener-50)<Math.abs(t.lightener-50)?e:t),s=Pt(i.target)-It>=44,r=s?-1:1,n="circle"===Nt[t%Nt.length]?this.exampleInstruction:mt.invitation.dragPoint;return j`<g class="example-instruction ${this.exampleCueAnimating?"example-cue-animating":""}"
      transform="translate(${Et(i.lightener)} ${Pt(i.target)})" aria-hidden="true">
      <circle class="example-cue-ring" r="15" />
      <path class="example-cue-leader" d="M -11 ${11*r} Q -16 ${35*r} -24 ${35*r}" />
      <text class="example-cue-label" x="-27" y=${35*r+(s?0:10)}
        text-anchor="end">${n}</text>
    </g>`}_renderCenteredHintBand(t,e,i,s){return j`
      <rect
        class="hint-band"
        x="${194-t/2}"
        y="${i-e/2}"
        width="${t}"
        height="${e}"
        rx="8"
        pointer-events="none"
      />
      ${s}
    `}_syncPreviewMorph(){const t=this.previewCurve?.controlPoints.length?this.previewCurve:null,e=t?`${(i=t).entityId}|${i.controlPoints.map(t=>`${t.lightener}:${t.target}`).join(",")}`:null;var i;if(e===(this._previewShown?.key??null))return void(this._previewMorph&&!Yt(this.joy,"ripple")&&this._stopPreviewMorph());const s=t?this._shownHeights(t.entityId):null;if(this._stopPreviewMorph(),this._previewShown=t&&e?{key:e,curve:t}:null,!t||!s||this.curveFrame||!this.isConnected)return;if(!Yt(this.joy,"ripple"))return;const r=Ni(t.controlPoints);r.every((t,e)=>Math.abs(t-s[e])<.01)||(this._previewMorph={from:s,to:r,progress:0},this._cancelPreviewMorphLoop=Jt(240,t=>{Wt()?this._stopPreviewMorph():this._previewMorph={from:s,to:r,progress:Ut(t/240)}},()=>this._stopPreviewMorph()))}_shownHeights(t){const e=this._previewShown?.curve.entityId===t?this._previewShown:null;if(e&&this._previewMorph)return Ui(this._previewMorph);const i=e?.curve??this.curves.find(e=>e.entityId===t&&e.visible);return i?.controlPoints.length?Ni(i.controlPoints):null}_stopPreviewMorph(){this._cancelPreviewMorphLoop?.(),this._cancelPreviewMorphLoop=null,this._previewMorph=null}_renderPreviewCurve(){const t=this.previewCurve;if(!t||!t.controlPoints.length)return K;try{const e=this._previewMorph?Ui(this._previewMorph):null,i=e?function(t){if(t.length<2)return"";let e=`M${t[0].x},${t[0].y}`;for(let i=1;i<t.length;i++)e+=` L${t[i].x},${t[i].y}`;return e}(e.map((t,i)=>({x:Et(100*i/(e.length-1)),y:Pt(t)}))):Dt(bt(t.controlPoints).map(t=>({x:Et(t.lightener),y:Pt(t.target)}))),s=this.scrubberPosition,r=null!==s?j`
              <circle
                class="preview-curve-point"
                r="3"
                cx="${Et(s)}"
                cy="${Pt(e?function(t,e){const i=Tt(e,0,100)/100*(t.length-1),s=Math.min(Math.floor(i),t.length-2);return t[s]+(t[s+1]-t[s])*(i-s)}(e,s):Lt(t.controlPoints,s))}"
              />`:K;return j`
        <g
          class="preview-curve"
          clip-path="url(#graph-area-${this._uid})"
          style="--preview-color: ${t.color}"
        >
          <path
            class="preview-curve-line ${this.joy.ripple?"preview-animating":""}"
            d="${i}"
            stroke="${t.color}"
          />
          ${r}
        </g>
      `}catch{return K}}render(){return q`
      <svg
        viewBox="0 0 ${Ct} ${St}"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Brightness curve editor graph"
        style="--graph-label-scale: ${this._labelScale}"
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
        ${this.readOnly?K:j`<rect
              class="hit-area"
              x="${xt}"
              y="${It}"
              width="${$t}"
              height="${kt}"
              pointer-events="all"
              fill="transparent"
              @pointerdown=${this._onHitAreaPointerDown}
              @pointerup=${this._onHitAreaPointerUp}
              @pointercancel=${this._onHitAreaPointerCancel}
            />`}
        ${this.joy.diagonal?j`<line class="diagonal-ref" x1=${Et(0)} y1=${Pt(0)}
              x2=${Et(100)} y2=${Pt(100)} pointer-events="none" />`:K}
        <!-- Phase 1: curve fills and lines (rendered before scrubber overlay) -->
        ${(()=>{const t=this._orderedCurves();return j`<g clip-path="url(#graph-area-${this._uid})">${this._renderDrawOut()}${t.map(({curve:t,idx:e})=>this._renderCurvePaths(t,e))}</g>`})()}
        ${this._renderDiagonalFlash()}
        <!-- Scrubber glow filters (only re-render when curves change, not on every position update) -->
        <defs>
          ${this.curves.filter(t=>t.visible).map(t=>{const e=`scrubber-glow-${t.color.replace("#","")}-${this._uid}`;return j`
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
        ${this.exampleEntityId?j`<desc id="example-${this._uid}">${mt.invitation.description}</desc>`:K}
        ${this._renderScrubberIndicator()}
        <!-- Only the axis strokes rise above Room dimming; the grid stays behind curves. -->
        ${this._renderAxes()} ${this._renderPreviewCurve()}
        <!-- Phase 3: control points rendered after scrubber overlay so they are always visible -->
        ${(()=>j`<g clip-path="url(#graph-area-${this._uid})">${this.curves.map((t,e)=>this._renderCurvePoints(t,e))}</g>`)()}
        ${this._renderExampleInstruction()}
        ${(()=>{if(this.readOnly)return K;if(0===this.curves.length){const t=112;return this._renderCenteredHintBand(220,32,t,j`<text class="hint hint-select" text-anchor="middle"
                x="${194}" y="${t+4}"
                pointer-events="none"
                >Add a light below to get started</text>`)}return K})()}
      </svg>
    `}}Hi.styles=a`
    .example-instruction {
      pointer-events: none;
      animation: invitation-appear ${Vt.cueFade}ms ease-out both;
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
      animation: example-point-invite ${Vt.pulse}ms ease-out infinite;
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
      max-height: var(--curve-graph-max-height, ${520}px);
      display: block;
      border-radius: 6px;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .grid-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 0.5;
      opacity: 0.075;
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
      font-size: calc(10px * var(--graph-label-scale, 1));
      font-weight: 500;
      font-family: inherit;
    }
    .tick-label {
      fill: var(--secondary-text, #616161);
      font-size: calc(10px * var(--graph-label-scale, 1));
      font-weight: 500;
      font-family: inherit;
    }
    /* Background curves stay fine; the selected curve keeps its weight and a
       curve hovered in the list draws heaviest. */
    .curve-line {
      fill: none;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: opacity 0.3s ease;
    }
    .curve-line.selected {
      stroke-width: 2.5;
    }
    .curve-line.hovered {
      stroke-width: 3;
    }
    /* A fill fades in when it appears, as the line does when it brightens. */
    .curve-fill {
      transition: opacity 0.3s ease;
      animation: curve-fill-in 0.3s ease backwards;
    }
    @keyframes curve-fill-in {
      from {
        opacity: 0;
      }
    }
    /* A removed light's last line holds while Edit lights closes, then fades. */
    .draw-out {
      animation: draw-out ${360}ms ease-out ${200}ms both;
    }
    @keyframes draw-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .draw-out {
        display: none;
      }
    }
    .marker-pop {
      transform-box: fill-box;
      transform-origin: center;
      animation: marker-pop ${o(`150ms ${Ht}`)} both;
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
    .preview-curve-line.preview-animating {
      animation: preview-dash-flow 1.6s linear infinite;
    }
    @keyframes preview-dash-flow {
      to {
        stroke-dashoffset: -8;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .preview-curve-line.preview-animating {
        animation: none;
      }
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
      /* Share the label cap so larger plots retain the original desktop
         handle size. Hit circles and interaction growth stay independent. */
      transform: rotate(var(--cp-rotate)) scale(calc(var(--cp-scale) * var(--graph-label-scale, 1)));
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
        ${o(Ht)} forwards;
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
    @media ${pi} {
      .example-cue-label {
        font-size: 16px;
      }
      svg {
        min-height: 180px;
      }
      .axis-label,
      .tick-label {
        font-size: calc(12px * var(--graph-label-scale, 1));
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
  `,t([vt({type:Array})],Hi.prototype,"curves",void 0),t([vt({type:String})],Hi.prototype,"selectedCurveId",void 0),t([vt({type:String})],Hi.prototype,"entityId",void 0),t([vt({type:Boolean})],Hi.prototype,"readOnly",void 0),t([vt({type:Number})],Hi.prototype,"scrubberPosition",void 0),t([vt({type:Boolean})],Hi.prototype,"showXAxisLabel",void 0),t([vt({attribute:!1})],Hi.prototype,"previewCurve",void 0),t([vt({attribute:!1})],Hi.prototype,"exampleEntityId",void 0),t([vt({attribute:!1})],Hi.prototype,"exampleInstruction",void 0),t([vt({type:Boolean})],Hi.prototype,"exampleCueAnimating",void 0),t([vt({attribute:!1})],Hi.prototype,"joy",void 0),t([vt({attribute:!1})],Hi.prototype,"curveFrame",void 0),t([vt({attribute:!1})],Hi.prototype,"drawIn",void 0),t([vt({attribute:!1})],Hi.prototype,"drawOut",void 0),t([vt({attribute:!1})],Hi.prototype,"hoveredCurveId",void 0),t([gt()],Hi.prototype,"_dragCurveIdx",void 0),t([gt()],Hi.prototype,"_dragPointIdx",void 0),t([gt()],Hi.prototype,"_hoveredPoint",void 0),t([gt()],Hi.prototype,"_focusedPoint",void 0),t([gt()],Hi.prototype,"_isMobile",void 0),t([gt()],Hi.prototype,"_labelScale",void 0),t([gt()],Hi.prototype,"_settle",void 0),t([gt()],Hi.prototype,"_flash",void 0),t([gt()],Hi.prototype,"_reveal",void 0),t([gt()],Hi.prototype,"_previewMorph",void 0),t([function(t){return(e,i,s)=>((t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,i),i))(e,i,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}("svg")],Hi.prototype,"_svgRef",void 0),Ce("curve-graph",Hi);const Bi=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"]);class zi extends ct{constructor(){super(...arguments),this.label="",this.value=0,this.interactionValue=null,this.displayValue="",this.valueText="",this.tooltip="",this.disabled=!1,this.showLabel=!0,this.appearance="bar",this.emphasis=!1,this.contextKey="",this._pointer=null,this._keys=new Set,this._keyContext=null,this._editing=!1,this._onWindowBlur=()=>this._finishGesture(),this._onVisibilityChange=()=>{document.hidden&&this._finishGesture()}}get _level(){return Number.isFinite(this.value)?Math.round(Math.max(0,Math.min(100,this.value))):0}get _interactionLevel(){const t=this.interactionValue??this.value;return Number.isFinite(t)?Math.max(0,Math.min(100,t)):0}connectedCallback(){super.connectedCallback(),window.addEventListener("blur",this._onWindowBlur),document.addEventListener("visibilitychange",this._onVisibilityChange)}disconnectedCallback(){this._finishGesture(),window.removeEventListener("blur",this._onWindowBlur),document.removeEventListener("visibilitychange",this._onVisibilityChange),super.disconnectedCallback()}willUpdate(t){t.has("disabled")&&this.disabled||t.has("contextKey")&&(this._pointer||null!==this._keyContext)?this._finishGesture():(t.has("value")||t.has("interactionValue"))&&this._pointer&&!this._pointer.dragging&&(this._pointer.startValue=this._interactionLevel,this._pointer.lastValue=this._interactionLevel)}_emit(t){this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0}))}_beginEdit(){this._editing||(this._editing=!0,this._emit("level-start"))}_emitValue(t){this.dispatchEvent(new CustomEvent("level-input",{detail:{value:t},bubbles:!0,composed:!0}))}_finishGesture(){const t=this._pointer,e=this._editing;this._pointer=null,this._editing=!1,this._keys.clear(),this._keyContext=null,t?.dragging&&this.requestUpdate();const i=this.renderRoot.querySelector("input");if(i&&(i.value=String(this._level)),t&&i?.hasPointerCapture?.(t.id))try{i.releasePointerCapture(t.id)}catch(t){if(!(t instanceof DOMException)||"NotFoundError"!==t.name)throw t}e&&this._emit("level-end")}_onPointerDown(t){if(this.disabled||this._pointer||!t.isPrimary||0!==t.button)return;const e=t.currentTarget,i=e.getBoundingClientRect().width;!Number.isFinite(i)||i<=0||(t.preventDefault(),t.stopPropagation(),this._finishGesture(),e.focus({preventScroll:!0}),!this.disabled&&this.isConnected&&(this._pointer={id:t.pointerId,x:t.clientX,y:t.clientY,width:i,startValue:this._interactionLevel,lastValue:this._interactionLevel,dragging:!1,context:this.contextKey},e.setPointerCapture(t.pointerId)))}_validPointer(t){const e=this._pointer;return e&&e.id===t.pointerId?this.disabled||e.context!==this.contextKey?(this._finishGesture(),null):e:null}_applyPointerValue(t,e){const i=t.clientX===e.x?e.startValue:Math.round(Math.max(0,Math.min(100,e.startValue+100*(t.clientX-e.x)/e.width)));i!==e.lastValue&&(e.lastValue=i,this._beginEdit(),this._pointer!==e||this.disabled||e.context!==this.contextKey?this._finishGesture():this._emitValue(i))}_onPointerMove(t){const e=this._validPointer(t);if(!e)return;const i=Math.abs(t.clientX-e.x),s=Math.abs(t.clientY-e.y);if(!e.dragging){if(s>=6&&s>=i)return void this._finishGesture();if(i<6||i<=s)return;e.dragging=!0,this.requestUpdate()}t.preventDefault(),t.stopPropagation(),this._applyPointerValue(t,e)}_onPointerUp(t){const e=this._validPointer(t);if(!e)return;const i=!e.dragging&&Math.hypot(t.clientX-e.x,t.clientY-e.y)<6;e.dragging&&this._applyPointerValue(t,e),this._finishGesture(),i&&!this.disabled&&e.context===this.contextKey&&this._emit("bar-focus")}_onPointerCancel(t){this._pointer?.id===t.pointerId&&this._finishGesture()}_onKeyDown(t){if(this.disabled)return;if("Enter"===t.key||" "===t.key||"Spacebar"===t.key)return t.preventDefault(),t.stopPropagation(),void(t.repeat||(this._finishGesture(),this._emit("bar-focus")));if(!Bi.has(t.key))return;if(t.repeat&&!this._keys.has(t.key))return void t.preventDefault();(this._pointer||null!==this._keyContext&&this._keyContext!==this.contextKey)&&this._finishGesture(),0===this._keys.size&&(t.currentTarget.value=String(Math.round(this._interactionLevel))),this._keyContext=this.contextKey,this._keys.add(t.key);const e=Math.round(this._interactionLevel);e!==this._interactionLevel&&(0===e&&["Home","ArrowLeft","ArrowDown","PageDown"].includes(t.key)||100===e&&["End","ArrowRight","ArrowUp","PageUp"].includes(t.key))&&(t.preventDefault(),this._onInput(t))}_onKeyUp(t){Bi.has(t.key)&&(this._keys.delete(t.key),0===this._keys.size&&this._finishGesture())}_onInput(t){t.stopPropagation();const e=t.currentTarget,i=e.valueAsNumber;if(this._pointer)return void(e.value=String(this._level));if(this.disabled||null!==this._keyContext&&this._keyContext!==this.contextKey||!Number.isFinite(i))return e.value=String(this._level),void this._finishGesture();const s=Math.round(Math.max(0,Math.min(100,i)));if(s===this._interactionLevel)return;const r=this.contextKey;this._beginEdit(),this._editing&&!this.disabled&&r===this.contextKey&&this.isConnected?this._emitValue(s):this._finishGesture(),e.value=String(this._level),0===this._keys.size&&this._finishGesture()}_onChange(t){t.stopPropagation(),0!==this._keys.size||this._pointer||this._finishGesture()}_onClick(t){t.preventDefault(),t.stopPropagation()}render(){const t=this._level,e="rail"===this.appearance,i=e?`width: calc((100% - 16px) * ${t/100})`:`width: ${t}%`,s=e?`left: calc(1px + (100% - 16px) * ${t/100})`:`left: clamp(8px, ${t}%, calc(100% - 8px))`;return q`
      <div
        class="bar ${this.disabled?"disabled":""} ${this._pointer?.dragging?"dragging":""}"
      >
        <span class="fill" aria-hidden="true" style=${i}></span>
        <span class="marker" aria-hidden="true" style=${s}></span>
        <span class="content" aria-hidden="true">
          ${this.showLabel?q`<span class="label"><slot name="label">${this.label}</slot></span>`:K}
          <span class="value">${this.displayValue||`${t}%`}</span>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          .value=${String(t)}
          ?disabled=${this.disabled}
          title=${this.tooltip||K}
          aria-label=${this.label}
          aria-valuetext=${this.valueText||this.displayValue||`${t}%`}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerCancel}
          @lostpointercapture=${this._onPointerCancel}
          @keydown=${this._onKeyDown}
          @keyup=${this._onKeyUp}
          @input=${this._onInput}
          @change=${this._onChange}
          @blur=${this._finishGesture}
          @click=${this._onClick}
        />
      </div>
    `}}zi.styles=a`
    :host {
      display: block;
      min-width: 0;
      font-family: inherit;
    }
    .bar {
      position: relative;
      isolation: isolate;
      box-sizing: border-box;
      min-width: 0;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      color: var(--primary-text-color, #212121);
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 8%, transparent);
      user-select: none;
      -webkit-user-select: none;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      max-width: 100%;
      border-radius: 8px 0 0 8px;
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 30%,
        var(--card-background-color, #fff)
      );
      pointer-events: none;
    }
    .marker {
      position: absolute;
      top: 15px;
      bottom: 15px;
      width: 5px;
      border-radius: 2px;
      background: var(--primary-text-color, #212121);
      opacity: 0.85;
      transform: translateX(-50%);
      pointer-events: none;
    }
    .content {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 0 16px 0 12px;
      pointer-events: none;
      font-size: var(--brightness-bar-font-size, 13px);
      line-height: 1.3;
    }
    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 550;
    }
    ::slotted([slot='label']) {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .value {
      flex: none;
      min-width: 34px;
      margin-left: auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    input {
      appearance: none;
      -webkit-appearance: none;
      position: absolute;
      inset: 0;
      z-index: 2;
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      opacity: 0;
      cursor: grab;
      touch-action: pan-y;
    }
    input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 1px;
      height: 48px;
    }
    input::-moz-range-thumb {
      width: 1px;
      height: 48px;
      border: 0;
    }
    .bar:has(input:focus-visible) {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 3px;
    }
    .bar:not(.disabled):hover {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 13%, transparent);
    }
    .dragging input {
      cursor: grabbing;
    }
    .disabled {
      opacity: 0.45;
    }
    input:disabled {
      cursor: default;
    }

    /* Rail: the label sits above a slim track inset 8px on both sides. The
       input still covers the whole surface, so targets and drags are unchanged. */
    :host([appearance='rail']) .bar {
      height: 44px;
      border-radius: 0;
      overflow: visible;
      background: transparent;
    }
    :host([appearance='rail']) .bar::before {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: 5px;
      height: 4px;
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 26%,
        var(--card-background-color, #fff)
      );
      pointer-events: none;
    }
    :host([appearance='rail']) .fill {
      inset: auto auto 5px 8px;
      height: 4px;
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--secondary-text-color, #616161) 80%,
        var(--card-background-color, #fff)
      );
    }
    :host([appearance='rail']) .marker {
      top: auto;
      bottom: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: color-mix(
        in srgb,
        var(--primary-text-color, #212121) 60%,
        var(--secondary-text-color, #616161)
      );
      opacity: 1;
      transform: none;
    }
    :host([appearance='rail']) .content {
      padding: 0 8px 10px;
    }
    /* Owners may place a detail line just above the label; the slotted
       content truncates its own text. */
    :host([appearance='rail']) .label {
      overflow: visible;
    }
    :host([appearance='rail']) .bar:not(.disabled):hover {
      background: transparent;
    }
    :host([appearance='rail'][emphasis]) .fill,
    :host([appearance='rail']) .bar:has(input:focus-visible) .fill {
      background: var(--bar-color, var(--primary-color, #2563eb));
    }
    :host([appearance='rail'][emphasis]) .marker,
    :host([appearance='rail']) .bar:has(input:focus-visible) .marker {
      background: color-mix(
        in srgb,
        var(--bar-color, var(--primary-color, #2563eb)) 55%,
        var(--primary-text-color, #212121)
      );
      box-shadow: 0 0 0 5px
        color-mix(in srgb, var(--bar-color, var(--primary-color, #2563eb)) 14%, transparent);
    }
  `,t([vt({type:String})],zi.prototype,"label",void 0),t([vt({type:Number})],zi.prototype,"value",void 0),t([vt({type:Number})],zi.prototype,"interactionValue",void 0),t([vt({type:String})],zi.prototype,"displayValue",void 0),t([vt({type:String})],zi.prototype,"valueText",void 0),t([vt({type:String})],zi.prototype,"tooltip",void 0),t([vt({type:Boolean})],zi.prototype,"disabled",void 0),t([vt({type:Boolean})],zi.prototype,"showLabel",void 0),t([vt({type:String,reflect:!0})],zi.prototype,"appearance",void 0),t([vt({type:Boolean,reflect:!0})],zi.prototype,"emphasis",void 0),t([vt({type:String})],zi.prototype,"contextKey",void 0),Ce("brightness-bar",zi);class Vi extends ct{constructor(){super(...arguments),this.curves=[],this.readOnly=!1,this.previewActive=!1,this.canPreview=!1,this.showPreviewToggle=!0,this.dirty=!1,this.example=!1,this.invitation=!1,this.firstUseHints=!1,this.showLabel=!0,this.alignToAxis=!1,this.contextKey="",this.position=null}_emit(t){this.readOnly&&"scrubber-start"===t||this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0}))}_move(t){if(this.readOnly||!Number.isFinite(t.detail.value))return;const e=Math.min(100,Math.max(0,t.detail.value));this.dispatchEvent(new CustomEvent("scrubber-move",{detail:{position:e},bubbles:!0,composed:!0}))}_onPreviewToggle(){this.canPreview&&this.dispatchEvent(new CustomEvent("preview-toggle",{bubbles:!0,composed:!0}))}render(){const t=Math.round(Math.min(100,Math.max(0,this.position??50))),e=0===t?mt.scrubber.off:`${t}%`;return q`
      <div class="scrubber-panel ${this.alignToAxis?"axis-aligned":""}">
        <brightness-bar
          .label=${mt.scrubber.sliderAria}
          .value=${t}
          .displayValue=${e}
          .valueText=${e}
          .showLabel=${this.showLabel}
          .disabled=${this.readOnly}
          .contextKey=${this.contextKey}
          @level-start=${()=>this._emit("scrubber-start")}
          @level-input=${this._move}
          @level-end=${()=>this._emit("scrubber-end")}
          ><span slot="label" class="scrubber-title">${mt.scrubber.title}</span></brightness-bar
        >
        ${this.canPreview&&this.showPreviewToggle||this.firstUseHints?q`<div class="scrubber-header">
              ${this.firstUseHints?q`<span class="invitation-caption"
                    >${this.invitation?mt.invitation.together:this.example?mt.invitation.example:K}</span
                  >`:K}
              ${this.canPreview&&this.showPreviewToggle?mi(this.previewActive,!1,()=>this._onPreviewToggle()):K}
            </div>`:K}
        ${this.previewActive&&this.dirty?q`<div class="preview-status" role="status">
              ${mt.scrubber.heldStatus} · ${mt.scrubber.heldStatusSave}
            </div>`:K}
      </div>
    `}}Vi.styles=a`
    ${gi}
    :host {
      display: block;
      min-width: 0;
      --accent: var(--primary-color, #2563eb);
    }
    .scrubber-panel {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .axis-aligned {
      margin-left: var(--room-axis-left, 0px);
      margin-right: var(--room-axis-right, 0px);
    }
    brightness-bar {
      --bar-color: var(--secondary-text-color, #616161);
    }
    .scrubber-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-width: 0;
    }
    .invitation-caption {
      margin-right: auto;
      color: var(--secondary-text-color, #616161);
      font-size: 11px;
    }
    .preview-status {
      font-size: 11px;
      color: var(--accent);
      line-height: 1.4;
    }
  `,t([vt({type:Array})],Vi.prototype,"curves",void 0),t([vt({type:Boolean})],Vi.prototype,"readOnly",void 0),t([vt({type:Boolean})],Vi.prototype,"previewActive",void 0),t([vt({type:Boolean})],Vi.prototype,"canPreview",void 0),t([vt({type:Boolean})],Vi.prototype,"showPreviewToggle",void 0),t([vt({type:Boolean})],Vi.prototype,"dirty",void 0),t([vt({type:Boolean})],Vi.prototype,"example",void 0),t([vt({type:Boolean})],Vi.prototype,"invitation",void 0),t([vt({type:Boolean})],Vi.prototype,"firstUseHints",void 0),t([vt({type:Boolean})],Vi.prototype,"showLabel",void 0),t([vt({type:Boolean})],Vi.prototype,"alignToAxis",void 0),t([vt({type:String})],Vi.prototype,"contextKey",void 0),t([vt({type:Number})],Vi.prototype,"position",void 0),Ce("curve-scrubber",Vi);const qi=(t,e,i)=>{const s=new Map;for(let r=e;r<=i;r++)s.set(t[r],r);return s},ji=$i(class extends ki{constructor(t){if(super(t),t.type!==Ii)throw Error("repeat() can only be used in text expressions")}dt(t,e,i){let s;void 0===i?i=e:void 0!==e&&(s=e);const r=[],n=[];let o=0;for(const e of t)r[o]=s?s(e,o):o,n[o]=i(e,o),o++;return{values:n,keys:r}}render(t,e,i){return this.dt(t,e,i).values}update(t,[e,i,s]){const r=(t=>t._$AH)(t),{values:n,keys:o}=this.dt(e,i,s);if(!Array.isArray(r))return this.ut=o,n;const a=this.ut??=[],l=[];let h,d,c=0,p=r.length-1,u=0,_=n.length-1;for(;c<=p&&u<=_;)if(null===r[c])c++;else if(null===r[p])p--;else if(a[c]===o[u])l[u]=Ti(r[c],n[u]),c++,u++;else if(a[p]===o[_])l[_]=Ti(r[p],n[_]),p--,_--;else if(a[c]===o[_])l[_]=Ti(r[c],n[_]),Pi(t,l[_+1],r[c]),c++,_--;else if(a[p]===o[u])l[u]=Ti(r[p],n[u]),Pi(t,r[c],r[p]),p--,u++;else if(void 0===h&&(h=qi(o,u,_),d=qi(a,c,p)),h.has(a[c]))if(h.has(a[p])){const e=d.get(o[u]),i=void 0!==e?r[e]:null;if(null===i){const e=Pi(t,r[c]);Ti(e,n[u]),l[u]=e}else l[u]=Ti(i,n[u]),Pi(t,r[c],i),r[e]=null;u++}else Li(r[p]),p--;else Li(r[c]),c++;for(;u<=_;){const e=Pi(t,l[_+1]);Ti(e,n[u]),l[u++]=e}for(;c<=p;){const t=r[c++];null!==t&&Li(t)}return this.ut=o,Ri(t,l),W}});function Wi(t){return t.replace(/[ \t\n\r\f]+/g," ").replace(/^ | $/g,"")}class Ki extends ct{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.exampleEntityId=null,this.scrubberPosition=null,this.readOnly=!0,this.contextKey="",this.editingCurves=null,this.canManage=!1,this.managing=!1,this.showManage=!1,this.hoveredCurveId=null,this._confirmingDeleteGroup=!1,this._manageOpen=!1,this._pendingManageFocus=null,this._onDocumentPointerDown=t=>{const e=this.renderRoot.querySelector(".manage-row");e&&t.composedPath().includes(e)||(this._manageOpen=!1)}}_focus(t){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_levelIntent(t,e,i){this.dispatchEvent(new CustomEvent(t,{detail:void 0===i?{entityId:e}:{entityId:e,target:i},bubbles:!0,composed:!0}))}_select(t){this.dispatchEvent(new CustomEvent("select-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_toggle(t,e){t.stopPropagation(),this.dispatchEvent(new CustomEvent("toggle-curve",{detail:{entityId:e},bubbles:!0,composed:!0}))}willUpdate(t){super.willUpdate(t),!t.has("canManage")&&!t.has("managing")||this.canManage&&!this.managing||(this._confirmingDeleteGroup=!1,this._manageOpen=!1)}updated(t){super.updated(t),t.has("_manageOpen")&&(this._manageOpen?document.addEventListener("pointerdown",this._onDocumentPointerDown,!0):document.removeEventListener("pointerdown",this._onDocumentPointerDown,!0));const e=this._pendingManageFocus;this._pendingManageFocus=null,e&&this.renderRoot.querySelector(e)?.focus({preventScroll:!0})}disconnectedCallback(){document.removeEventListener("pointerdown",this._onDocumentPointerDown,!0),this._manageOpen=!1,super.disconnectedCallback()}_hover(t,e){"touch"!==e?.pointerType&&this.dispatchEvent(new CustomEvent("hover-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_toggleManage(){this.canManage&&!this.managing&&(this._manageOpen=!this._manageOpen)}_onManageKeyDown(t){"Escape"===t.key&&this._manageOpen&&(t.preventDefault(),this._manageOpen=!1,this._pendingManageFocus=".manage-trigger")}_onItemKeyDown(t){if("ArrowDown"===t.key||"ArrowUp"===t.key){t.preventDefault();const e=[...this.renderRoot.querySelectorAll(".row-select-btn")],i=e.indexOf(t.currentTarget),s="ArrowDown"===t.key?i+1:i-1;e[s]?.focus()}}_onToggleKeyDown(t,e){"Enter"!==t.key&&" "!==t.key||(t.preventDefault(),this._toggle(t,e))}_openEditLights(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this._manageOpen=!1,this.dispatchEvent(new CustomEvent("edit-lights",{bubbles:!0,composed:!0})))}render(){const t=this.curves.map(t=>Wi(t.friendlyName)),e=new Map;for(const i of t)e.set(i,(e.get(i)??0)+1);const i=t.map(t=>(e.get(t)??0)>1),s=this.curves.map((t,e)=>i[e]?`${t.friendlyName} (${t.entityId})`:t.friendlyName),r=new Map;for(const t of s){const e=Wi(t);r.set(e,(r.get(e)??0)+1)}const n=new Set(s.map(Wi));for(let t=0;t<s.length;t++)if((r.get(Wi(s[t]))??0)>1){do{s[t]+=` (${this.curves[t].entityId})`}while(n.has(Wi(s[t])));n.add(Wi(s[t]))}const o=this.curves.filter(t=>t.visible).length,a=this.curves.length-o,l=0===this.curves.length?mt.legend.emptyCount:0===a?mt.legend.countAllVisible(this.curves.length):mt.legend.countWithHidden(o,a),h=this.curves.length>=20,d=Math.round(this.scrubberPosition??100),c=this.curves.some(t=>t.entityId===this.hoveredCurveId)?this.hoveredCurveId:null;return q`
      <div
        class="legend-panel ${h?"large-group":""}"
        data-density=${h?"large":"normal"}
      >
        ${this._renderManage()}
        <div class="legend-header">
          <div class="legend-label">${mt.legend.title}</div>
          <div class="legend-count" title=${l}>${l}</div>
        </div>
        <div
          class="legend ${c?"has-hover":""} ${this.curves.length>8?"capped":""}"
          role="list"
          aria-label=${mt.legend.listAria(this.curves.length)}
        >
          ${ji(this.curves,t=>t.entityId,(t,e)=>{const i=s[e],r=Rt(t.controlPoints,d),n=0===r?mt.legend.off:0===Math.round(r)?"<1%":`${Math.round(r)}%`,o=null===this.scrubberPosition?i:`${i} ${n}`,a=this.selectedCurveId===t.entityId,l=c===t.entityId,h=Rt((this.editingCurves?.find(e=>e.entityId===t.entityId)??t).controlPoints,d),p=this.readOnly||!t.visible||0===d,u=`${t.entityId===this.exampleEntityId?"≈ ":""}${n}`;return q`
                <div
                  class="legend-item ${t.visible?"":"hidden"} ${a?"selected":""} ${l?"hovered":""}"
                  role="listitem"
                  style="--accent-color: ${t.color}"
                  @pointerenter=${e=>this._hover(t.entityId,e)}
                  @pointerleave=${t=>this._hover(null,t)}
                  @pointercancel=${()=>this._hover(null)}
                >
                  <button
                    type="button"
                    class="row-select-btn"
                    aria-label=${t.entityId===this.exampleEntityId?`${o} · ${mt.invitation.values}`:o}
                    aria-pressed=${a?"true":"false"}
                    @click=${()=>this._select(t.entityId)}
                    @keydown=${t=>this._onItemKeyDown(t)}
                  >
                    <span
                      class="color-dot shape-${Ki._shapes[e%Ki._shapes.length]}"
                      style="background: ${t.color}; --dot-color: ${t.color}"
                    ></span>
                  </button>
                  <brightness-bar
                    appearance="rail"
                    .emphasis=${a||l}
                    .label=${mt.legend.brightnessAria(i)}
                    .value=${Math.round(r)}
                    .interactionValue=${h}
                    .displayValue=${u}
                    .tooltip=${`${t.friendlyName}\n${t.entityId}`}
                    .valueText=${0===d?mt.legend.roomOff:mt.legend.brightnessAt(n,d)}
                    .disabled=${p}
                    .contextKey=${`${this.contextKey}:${t.entityId}:${this.scrubberPosition}`}
                    style="--bar-color: ${t.color}"
                    @bar-focus=${()=>this._focus(t.entityId)}
                    @level-start=${()=>this._levelIntent("light-level-start",t.entityId)}
                    @level-input=${e=>this._levelIntent("light-level-input",t.entityId,e.detail.value)}
                    @level-end=${()=>this._levelIntent("light-level-end",t.entityId)}
                  >
                    <span class="name-block" slot="label">
                      <span class="name" title=${t.friendlyName}>${t.friendlyName}</span>
                      <span class="entity-id" title=${t.entityId}>${t.entityId}</span>
                    </span>
                  </brightness-bar>
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
                      ${t.visible?j`
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              `:j`
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
      </div>
    `}_renderManage(){if(!this.showManage&&!this.managing)return K;const t=this._manageOpen;return q`
      <div class="manage-row" @keydown=${this._onManageKeyDown}>
        ${this.managing?q`<div class="managing-row" role="status" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              ${mt.legend.updating}
            </div>`:K}
        <button
          type="button"
          class="manage-trigger"
          aria-label=${mt.legend.manageAria}
          aria-expanded=${t?"true":"false"}
          aria-controls=${t?"manage-menu":K}
          ?disabled=${!this.canManage||this.managing}
          @click=${this._toggleManage}
        >
          ${mt.legend.manage}
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8"></circle>
            <circle cx="12" cy="12" r="1.8"></circle>
            <circle cx="19" cy="12" r="1.8"></circle>
          </svg>
        </button>
        ${t?q`<div
              class="manage-menu"
              id="manage-menu"
              role="group"
              aria-label=${mt.legend.manageAria}
            >
              <button
                type="button"
                class="manage-item add-light-btn"
                @click=${this._openEditLights}
              >
                ${mt.membership.title}
              </button>
              <button
                type="button"
                class="manage-item delete-group-btn link"
                @click=${this._startDeleteGroup}
              >
                ${mt.legend.deleteGroup}
              </button>
            </div>`:K}
      </div>
      ${this._confirmingDeleteGroup&&this.canManage?q`<div class="delete-group-confirm">
            <span class="delete-group-text">${mt.legend.deleteConfirm}</span>
            <div class="delete-group-actions">
              <button
                type="button"
                class="delete-group-btn cancel"
                ?disabled=${this.managing}
                @click=${this._cancelDeleteGroup}
              >
                ${mt.legend.deleteCancel}
              </button>
              <button
                type="button"
                class="delete-group-btn danger"
                ?disabled=${this.managing}
                @click=${this._confirmDeleteGroup}
              >
                ${mt.legend.deleteAction}
              </button>
            </div>
          </div>`:K}
    `}_startDeleteGroup(){this.canManage&&!this.managing&&(this._manageOpen=!1,this._confirmingDeleteGroup=!0,this._pendingManageFocus=".delete-group-btn.cancel")}_cancelDeleteGroup(){this._confirmingDeleteGroup=!1,this._pendingManageFocus=".manage-trigger"}_confirmDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("delete-group",{bubbles:!0,composed:!0})))}}Ki.styles=a`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .legend-panel {
      position: relative;
      background: transparent;
      /* Up to eight lights stay open. Longer lists scroll inside this rail;
         the editor commands live beside or above it, never below it. */
      --curve-legend-max-height: min(60vh, 470px);
    }
    .legend-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      min-height: 20px;
      padding: 0 0 10px;
    }
    .legend-label {
      font-size: 13px;
      font-weight: 550;
      color: var(--primary-text-color, #212121);
    }
    .legend-count {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 400;
      color: var(--secondary-text-color, #616161);
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow: auto;
    }
    .legend.capped {
      max-height: var(--curve-legend-max-height, none);
    }
    .legend-item {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) 44px;
      gap: 4px;
      align-items: start;
      position: relative;
      box-sizing: border-box;
      min-height: 68px;
      padding: 9px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--divider) 45%, transparent);
      user-select: none;
      font-size: var(--text-md, 13px);
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      transition:
        opacity 150ms ease-out,
        background 150ms ease-out;
    }
    .legend-item.selected {
      background: color-mix(in srgb, var(--accent-color) 9%, transparent);
      border-radius: 8px;
    }
    .legend-item:focus-within:not(.selected) {
      background: color-mix(in srgb, var(--primary-text-color, #212121) 2%, transparent);
    }
    /* Pointer hover isolates one light without changing what is selected. */
    .legend.has-hover .legend-item:not(.hovered) {
      opacity: 0.32;
    }
    @media (prefers-reduced-motion: reduce) {
      .legend-item {
        transition: none;
      }
    }
    .row-select-btn {
      grid-column: 1;
      grid-row: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      align-self: center;
      width: 44px;
      min-width: 44px;
      min-height: 48px;
      padding: 0;
      margin: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .row-select-btn:focus {
      outline: none;
    }
    .row-select-btn:focus-visible {
      background: color-mix(in srgb, var(--primary-color, #2563eb) 10%, transparent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #2563eb) 50%, transparent);
    }
    .color-dot {
      width: 9px;
      height: 9px;
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
      width: 8px;
      height: 8px;
    }
    .color-dot.shape-triangle {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 9px solid var(--dot-color);
      background: transparent !important;
    }
    .color-dot.shape-bar {
      border-radius: 2px;
      width: 10px;
      height: 6px;
      margin: 2px 0;
    }
    .legend-item.hidden .color-dot {
      opacity: 0.45;
    }
    brightness-bar {
      grid-column: 2;
      grid-row: 1;
      min-width: 0;
    }
    .eye-btn {
      grid-column: 3;
      grid-row: 1;
      align-self: center;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 44px;
      height: 48px;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--secondary-text-color, #616161);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .eye-btn svg {
      width: 20px;
      height: 20px;
      flex: 0 0 20px;
      display: block;
    }
    .eye-btn:hover {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
    }
    .eye-btn:focus {
      outline: none;
    }
    .eye-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    /* The ID sits above the name in the row's top space, so revealing it on
       hover, focus or selection never moves the name, rail or row. */
    .name-block {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: visible;
    }
    .name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      font-weight: 500;
    }
    .legend-item.hovered .name,
    .legend-item.selected .name {
      font-weight: 600;
    }
    .entity-id {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 100%;
      display: block;
      height: 12px;
      line-height: 12px;
      font-size: 10px;
      font-weight: 400;
      color: var(--primary-text-color, #212121);
      opacity: 0.85;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
      transition: opacity 0.15s ease;
    }
    .legend-item:not(.selected):not(:hover):not(:focus-within) .entity-id {
      opacity: 0;
    }
    .manage-row {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      min-height: 44px;
      margin-bottom: 8px;
    }
    .manage-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      min-height: 44px;
      min-width: 44px;
      padding: 8px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    .manage-trigger svg {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
    }
    .manage-trigger:hover:not(:disabled),
    .manage-trigger[aria-expanded='true'] {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 14%, transparent);
    }
    .manage-trigger:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .manage-menu {
      position: absolute;
      top: 48px;
      right: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      min-width: 190px;
      padding: 6px;
      border: 1px solid var(--divider);
      border-radius: 12px;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
    }
    .manage-item {
      display: flex;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      padding: 8px 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--primary-text-color, #212121);
      font: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }
    .manage-item:hover:not(:disabled) {
      background: color-mix(in srgb, var(--secondary-text-color, #616161) 12%, transparent);
    }
    .manage-item.delete-group-btn {
      color: var(--error-color, #db4437);
    }
    .manage-item svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }
    .manage-trigger:focus-visible,
    .manage-item:focus-visible,
    .delete-group-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .delete-group-confirm {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
      padding: 8px 10px;
      border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 45%, transparent);
      border-radius: 8px;
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
    .delete-group-actions .delete-group-btn {
      min-height: 44px;
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
    .managing-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: auto;
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
    @media ${pi} {
      .legend-item {
        font-size: 14px;
      }
    }
  `,Ki._shapes=Nt,t([vt({type:Array})],Ki.prototype,"curves",void 0),t([vt({type:String})],Ki.prototype,"selectedCurveId",void 0),t([vt({attribute:!1})],Ki.prototype,"exampleEntityId",void 0),t([vt({type:Number})],Ki.prototype,"scrubberPosition",void 0),t([vt({type:Boolean})],Ki.prototype,"readOnly",void 0),t([vt({type:String})],Ki.prototype,"contextKey",void 0),t([vt({attribute:!1})],Ki.prototype,"editingCurves",void 0),t([vt({type:Boolean})],Ki.prototype,"canManage",void 0),t([vt({type:Boolean})],Ki.prototype,"managing",void 0),t([vt({type:Boolean})],Ki.prototype,"showManage",void 0),t([vt({attribute:!1})],Ki.prototype,"hoveredCurveId",void 0),t([gt()],Ki.prototype,"_confirmingDeleteGroup",void 0),t([gt()],Ki.prototype,"_manageOpen",void 0),Ce("curve-legend",Ki);class Yi extends ct{constructor(){super(...arguments),this.dirty=!1,this.readOnly=!1,this.saving=!1,this.animating=!1,this.canUndo=!1,this.persistent=!1,this.saveDisabled=!1}_onSave(){this.dispatchEvent(new CustomEvent("save-curves",{bubbles:!0,composed:!0}))}_onCancel(){this.dispatchEvent(new CustomEvent("cancel-curves",{bubbles:!0,composed:!0}))}_onUndo(){this.dispatchEvent(new CustomEvent("undo-curves",{bubbles:!0,composed:!0}))}render(){return this.readOnly?q`
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
      `:this.persistent||this.dirty||this.canUndo?q`
      <div class="footer ${this.persistent?"persistent":""}">
        ${this.canUndo||this.persistent?q`
              <button
                class="btn-ghost btn-undo"
                @click=${this._onUndo}
                ?disabled=${this.saving||this.persistent&&!this.canUndo}
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
          ?disabled=${this.saving||this.animating||this.persistent&&!this.dirty&&!this.canUndo}
          aria-label="Cancel changes"
        >
          Cancel
        </button>
        <button
          class="btn-save"
          @click=${this._onSave}
          ?disabled=${this.saving||this.animating||this.saveDisabled||this.persistent&&!this.dirty}
          aria-label="Save changes (Ctrl+S)"
        >
          ${this.saving?mt.footer.saving:mt.footer.save}
        </button>
      </div>
    `:q``}}Yi.styles=a`
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
      padding: 6px 0 0;
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
    .footer.persistent {
      min-height: 44px;
      padding: 0;
      white-space: nowrap;
    }
    .persistent button {
      box-sizing: border-box;
      min-height: 44px;
      padding-inline: 12px;
    }
    /* Apart from Cancel and Save whenever the row is wider than its buttons. */
    .persistent .btn-undo {
      margin-right: auto;
    }
    .persistent .btn-save {
      min-width: 80px;
    }
    .persistent .btn-save:disabled {
      background: transparent;
      color: var(--secondary-text, #616161);
      box-shadow: inset 0 0 0 1px var(--divider);
    }
    @media ${pi} {
      .footer {
        min-height: 48px;
      }
      button {
        padding: 12px 20px;
        font-size: 14px;
        min-height: 44px;
      }
    }
  `,t([vt({type:Boolean})],Yi.prototype,"dirty",void 0),t([vt({type:Boolean})],Yi.prototype,"readOnly",void 0),t([vt({type:Boolean})],Yi.prototype,"saving",void 0),t([vt({type:Boolean})],Yi.prototype,"animating",void 0),t([vt({type:Boolean})],Yi.prototype,"canUndo",void 0),t([vt({type:Boolean})],Yi.prototype,"persistent",void 0),t([vt({type:Boolean})],Yi.prototype,"saveDisabled",void 0),Ce("curve-footer",Yi);const Ji="[Lightener] Unsupported or malformed candidate_state_metadata. Expected v1 with boolean hidden, disabled, and missing on every light; using the legacy all-visible view.";function Xi(t){return"object"==typeof t&&null!==t&&!Array.isArray(t)}function Zi(t){return"string"==typeof t?t:null}function Qi(t,e){if(!Xi(t))throw new Error(`Invalid candidate response: lights[${e}] must be an object`);const i=function(t,e){if("string"!=typeof t)throw new Error(`Invalid candidate response: ${e} must be a string`);return t}(t.entity_id,`lights[${e}].entity_id`);return{entity_id:i,name:"string"==typeof t.name?t.name:i,available:"boolean"==typeof t.available&&t.available,area_id:Zi(t.area_id),area_name:Zi(t.area_name)}}function ts(t){if(!Xi(t))throw new Error("Invalid candidate response: expected an object");if(!Array.isArray(t.observed_controlled_entity_ids))throw new Error("Invalid candidate response: observed_controlled_entity_ids must be an array");if(!t.observed_controlled_entity_ids.every(t=>"string"==typeof t))throw new Error("Invalid candidate response: observed_controlled_entity_ids must contain strings");if(!Array.isArray(t.lights))throw new Error("Invalid candidate response: lights must be an array");const e=t.lights,i=e.map(Qi),s=t.capabilities;let r="legacy",n=null;if(void 0!==s)if(Xi(s)){if(o=s,a="candidate_state_metadata",Object.prototype.hasOwnProperty.call(o,a))if(1!==s.candidate_state_metadata)n=Ji;else{e.every(t=>Xi(t)&&"boolean"==typeof t.hidden&&"boolean"==typeof t.disabled&&"boolean"==typeof t.missing)?r="v1":n=Ji}}else n=Ji;var o,a;const l=i.map((t,i)=>{if("legacy"===r)return{...t,hidden:!1,disabled:!1,missing:!1};const s=e[i];return{...t,hidden:s.hidden,disabled:s.disabled,missing:s.missing}});return{observedControlledEntityIds:[...t.observed_controlled_entity_ids],lights:l,metadataMode:r,metadataWarning:n}}class es extends ct{constructor(){super(...arguments),this.hass=null,this.groupEntityId="",this.beginApply=null,this._lights=[],this._observedOrder=[],this._pendingSelectedIds=new Set,this._metadataMode="legacy",this._search="",this._areaId="",this._currentGroupOnly=!1,this._showExceptional=!1,this._loading=!0,this._applying=!1,this._loadError=null,this._applyError=null,this._applyErrorCode=null,this._announcedResultSummary="",this._initialMemberIds=new Set,this._candidateOrder=[],this._loadInFlight=!1,this._loaded=!1,this._loadSerial=0,this._metadataWarningEmitted=!1,this._resultAnnouncementTimer=null,this._areaOptions=[],this._boundKeydown=t=>this._onKeydown(t)}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this._boundKeydown),this.hasUpdated&&this._loadIfReady()}disconnectedCallback(){this._loadSerial+=1,this._loadInFlight=!1,this._loaded||(this._loading=!1),this._clearResultAnnouncementTimer(),document.removeEventListener("keydown",this._boundKeydown),super.disconnectedCallback()}firstUpdated(){const t=this.renderRoot.querySelector(".load-error");if(t)return void t.focus();const e=this.renderRoot.querySelector("#membership-search");e&&!e.disabled?e.focus():this.renderRoot.querySelector("#membership-title")?.focus()}willUpdate(t){const e=t.has("groupEntityId")&&t.get("groupEntityId")!==this.groupEntityId,i=t.has("hass")&&!this.hass||t.has("groupEntityId")&&!this.groupEntityId;(e||i)&&this._resetForGroup()}updated(t){(t.has("hass")||t.has("groupEntityId"))&&this._loadIfReady(),(t.has("_lights")||t.has("_pendingSelectedIds")||t.has("_search")||t.has("_areaId")||t.has("_currentGroupOnly")||t.has("_showExceptional")||t.has("_loaded")||t.has("_loadError"))&&this._scheduleResultAnnouncement()}_resetForGroup(){this._loadSerial+=1,this._loadInFlight=!1,this._loaded=!1,this._lights=[],this._observedOrder=[],this._initialMemberIds=new Set,this._pendingSelectedIds=new Set,this._candidateOrder=[],this._areaOptions=[],this._metadataMode="legacy",this._search="",this._areaId="",this._currentGroupOnly=!1,this._showExceptional=!1,this._loading=!0,this._applying=!1,this._loadError=null,this._applyError=null,this._applyErrorCode=null,this._announcedResultSummary="",this._clearResultAnnouncementTimer(),this.hass&&this.groupEntityId||(this._loading=!1)}_loadIfReady(){this.isConnected&&this.hass&&this.groupEntityId&&!this._loadInFlight&&!this._loaded&&!this._loadError&&this._load()}async _load(){if(!this.hass||!this.groupEntityId||this._loadInFlight)return;const t=this.hass,e=this.groupEntityId,i=++this._loadSerial;this._loadInFlight=!0,this._loading=!0,this._loadError=null,this._applyError=null,this._applyErrorCode=null;try{let s,r;try{s=await t.callWS({type:"lightener/list_candidate_lights",entity_id:e})}catch(t){return void(i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"request"))}if(i!==this._loadSerial||e!==this.groupEntityId)return;try{r=ts(s)}catch(t){return void(i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"response"))}r.metadataWarning&&!this._metadataWarningEmitted&&(this._metadataWarningEmitted=!0,console.warn(r.metadataWarning)),this._initialMemberIds=new Set(r.observedControlledEntityIds),this._candidateOrder=r.lights.map(t=>t.entity_id),this._lights=function(t,e,i){const s=new Intl.Collator(i,{sensitivity:"base",numeric:!0});return[...t].sort((t,i)=>{const r=e.has(t.entity_id);return r!==e.has(i.entity_id)?r?-1:1:s.compare(t.name,i.name)||s.compare(t.entity_id,i.entity_id)})}(r.lights,this._initialMemberIds,t.locale?.language),this._observedOrder=r.observedControlledEntityIds,this._pendingSelectedIds=new Set(r.observedControlledEntityIds),this._metadataMode=r.metadataMode,this._rebuildAreaOptions(),this._loaded=!0,this._loadError=null,this._loading=!1,this._afterNextRender("focus the loaded membership dialog",()=>{if(i!==this._loadSerial||e!==this.groupEntityId)return;const t=this.renderRoot.querySelector("#membership-title"),s=this.shadowRoot?.activeElement??null;null!==s&&s!==t||this._focusOrHeading(this.renderRoot.querySelector("#membership-search"))})}catch(t){i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"process")}finally{i===this._loadSerial&&(this._loadInFlight=!1,this._loading=!1)}}_setLoadFailure(t,e){console.error(`[Lightener] Failed to ${e} candidate lights:`,t),this._loaded=!1,this._loadError=mt.membership.loadError,this._loading=!1,this._afterNextRender("focus the membership load error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".load-error"))})}_afterNextRender(t,e){this.updateComplete.then(e).catch(e=>{console.error(`[Lightener] Failed to ${t}:`,e)})}_retryLoad(){this._loadInFlight||this._applying||!this._loadError||(this._loaded=!1,this._loadError=null,this._loadIfReady())}_errorMessage(t,e){const i=t;return"conflict"===i?.code?mt.membership.conflictError:"disabled_entity"===i?.code?mt.membership.disabledError:"reload_failed"===i?.code?mt.membership.reloadError:"rollback_reload_failed"===i?.code?mt.membership.rollbackError:"preview_active"===i?.code?mt.restoration.membershipBlocked:e}get _groupName(){return this.hass?.states[this.groupEntityId]?.attributes.friendly_name??this.groupEntityId}_isExceptional(t){return"v1"===this._metadataMode&&(t.hidden||t.disabled)}_matchesSearchAndArea(t,e){return(!this._areaId||t.area_id===this._areaId)&&!(e&&!t.name.toLocaleLowerCase().includes(e)&&!t.entity_id.toLocaleLowerCase().includes(e))}_matchesScopeAndDiscovery(t,e){return(!this._currentGroupOnly||this._initialMemberIds.has(t.entity_id))&&this._matchesSearchAndArea(t,e)}_isSuppressedExceptional(t){return this._isExceptional(t)&&!this._initialMemberIds.has(t.entity_id)&&!this._pendingSelectedIds.has(t.entity_id)}_computeView(){const t=this._search.trim().toLocaleLowerCase(),e=[];let i=0,s=0;for(const r of this._lights){if(!this._matchesScopeAndDiscovery(r,t))continue;const n=this._isSuppressedExceptional(r);n&&(s+=1),!this._showExceptional&&n||(e.push(r),this._pendingSelectedIds.has(r.entity_id)&&(i+=1))}return{visible:e,visibleSelected:i,exceptionalCount:s}}get _areas(){return this._areaOptions}_rebuildAreaOptions(){const t=new Map;for(const e of this._lights)e.area_id&&e.area_name&&t.set(e.area_id,e.area_name);const e=new Intl.Collator(this.hass?.locale?.language,{sensitivity:"base"});this._areaOptions=[...t].map(([t,e])=>({id:t,name:e})).sort((t,i)=>e.compare(t.name,i.name))}get _hasChanges(){return this._pendingSelectedIds.size!==this._observedOrder.length||this._observedOrder.some(t=>!this._pendingSelectedIds.has(t))}get _applyBlockedByConflict(){return"conflict"===this._applyErrorCode}_statuses(t){const e=[];return t.hidden&&e.push(mt.membership.hidden),t.disabled&&e.push(mt.membership.disabled),t.missing?e.push(mt.membership.missing):t.available||t.disabled||e.push(mt.membership.unavailable),e}_isNewDisabled(t){return t.disabled&&!this._initialMemberIds.has(t.entity_id)}_toggle(t){if(this._applying||this._isNewDisabled(t))return;const e=new Set(this._pendingSelectedIds),i=e.has(t.entity_id);i?e.delete(t.entity_id):e.add(t.entity_id);const s=i&&!this._showExceptional&&this._isExceptional(t)&&!this._initialMemberIds.has(t.entity_id);this._pendingSelectedIds=e,this._applyBlockedByConflict||(this._applyError=null,this._applyErrorCode=null),s&&this._afterNextRender("restore focus after hiding an exceptional light",()=>{this._focusOrHeading(this.renderRoot.querySelector(".exceptional-filter"))})}_clearSearchAndArea(){this._search="",this._areaId="",this._afterNextRender("restore focus after clearing membership filters",()=>{this._focusOrHeading(this.renderRoot.querySelector("#membership-search"))})}_showAllLights(){this._currentGroupOnly=!1,this._afterNextRender("restore focus after showing all lights",()=>{this._focusOrHeading(this.renderRoot.querySelector(".light-row input:not(:disabled)"))})}_revealExceptional(){const t=this._search.trim().toLocaleLowerCase(),e=this._lights.find(e=>this._matchesScopeAndDiscovery(e,t)&&this._isSuppressedExceptional(e))?.entity_id;this._showExceptional=!0,this._afterNextRender("restore focus after revealing exceptional lights",()=>{const t=e?[...this.renderRoot.querySelectorAll("input[data-entity-id]")].find(t=>t.dataset.entityId===e&&!t.disabled):null;this._focusOrHeading(t??null)})}_focusOrHeading(t){t&&!t.matches(":disabled")&&(t.focus(),this.shadowRoot?.activeElement===t)||this.renderRoot.querySelector("#membership-title")?.focus()}_clearResultAnnouncementTimer(){null!==this._resultAnnouncementTimer&&(clearTimeout(this._resultAnnouncementTimer),this._resultAnnouncementTimer=null)}_scheduleResultAnnouncement(){if(this._clearResultAnnouncementTimer(),!this._loaded||this._loadError)return void(this._announcedResultSummary="");const{visible:t,visibleSelected:e}=this._computeView(),i=mt.membership.resultSummary(t.length,e,this._pendingSelectedIds.size);this._resultAnnouncementTimer=setTimeout(()=>{this._resultAnnouncementTimer=null,this.isConnected&&this._loaded&&!this._loadError&&(this._announcedResultSummary=i)},es.RESULT_ANNOUNCEMENT_DELAY_MS)}_close(){this._applying||this.dispatchEvent(new CustomEvent("membership-close",{bubbles:!0,composed:!0}))}async _apply(){if(!this.hass||!this.groupEntityId||this._applying||this._loading||this._applyBlockedByConflict)return;if(0===this._pendingSelectedIds.size)return this._applyError=mt.membership.emptyError,void this._afterNextRender("focus the empty membership error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".apply-error"))});if(!this._hasChanges)return;this._applying=!0,this._applyError=null,this._applyErrorCode=null;const t=this.groupEntityId,e=this.hass.user.id,i=this._loadSerial;let s=!1,r=null,n=!1;try{const s=new Set(this._observedOrder),o=this._observedOrder.filter(t=>this._pendingSelectedIds.has(t));if(o.push(...this._candidateOrder.filter(t=>this._pendingSelectedIds.has(t)&&!s.has(t))),this.beginApply&&(r=this.beginApply([...this._observedOrder,...o]),!r))throw{code:"preview_active"};const a=await this.hass.callWS({type:"lightener/set_controlled_lights",entity_id:this.groupEntityId,controlled_entity_ids:o,observed_controlled_entity_ids:this._observedOrder});if(n=!!a&&!!a.entities&&Array.isArray(a.added_entity_ids)&&Array.isArray(a.removed_entity_ids),r&&!n)throw new Error(mt.membership.applyError);if(!this.isConnected||t!==this.groupEntityId||e!==this.hass?.user.id||i!==this._loadSerial)return;this.dispatchEvent(new CustomEvent("membership-applied",{detail:a,bubbles:!0,composed:!0}))}catch(t){s=!0,this._applyErrorCode="string"==typeof t?.code?t.code??null:null,this._applyError=this._errorMessage(t,mt.membership.applyError),n=new Set(["empty_selection","too_many","duplicate","self_reference","not_a_light","recursive_lightener","disabled_entity","conflict","invalid_format","unauthorized"]).has(this._applyErrorCode??"")}finally{n&&r?.(),this._applying=!1}s&&this._afterNextRender("focus the membership update error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".apply-error"))})}_onKeydown(t){if("Escape"===t.key)return void(this._applying||(t.preventDefault(),t.stopPropagation(),this._close()));if("Tab"!==t.key)return;const e=[...this.renderRoot.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")];if(0===e.length)return t.preventDefault(),void this.renderRoot.querySelector("#membership-title")?.focus();const i=e[0],s=e[e.length-1],r=this.shadowRoot?.activeElement??null;e.includes(r)?t.shiftKey&&r===i?(t.preventDefault(),s.focus()):t.shiftKey||r!==s||(t.preventDefault(),i.focus()):(t.preventDefault(),(t.shiftKey?s:i).focus())}_renderEmptyState(t){if(0===this._lights.length)return q`<div class="state-message">
        <div class="empty-copy">${mt.membership.sourceEmpty}</div>
      </div>`;const e=this._showExceptional?0:t.exceptionalCount;return e>0?q`<div class="state-message">
        <div class="empty-copy">${mt.membership.exceptionalEmpty(e)}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._revealExceptional}
        >
          ${mt.membership.showExceptionalAction}
        </button>
      </div>`:this._search.trim()||this._areaId?q`<div class="state-message">
        <div class="empty-copy">${mt.membership.filterEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._clearSearchAndArea}
        >
          ${mt.membership.clearFilters}
        </button>
      </div>`:this._currentGroupOnly?q`<div class="state-message">
        <div class="empty-copy">${mt.membership.scopeEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._showAllLights}
        >
          ${mt.membership.showAllLights}
        </button>
      </div>`:q`<div class="state-message">
      <div class="empty-copy">${mt.membership.filterEmpty}</div>
    </div>`}_renderList(t){if(this._loading)return q`<div class="state-message" role="status" aria-live="polite">
        <div class="loading-copy">${mt.membership.loading}</div>
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
          ${mt.membership.tryAgain}
        </button>
      </div>`;const{visible:e}=t;return 0===e.length?this._renderEmptyState(t):q`${ji(e,t=>t.entity_id,t=>{const e=this._statuses(t),i=`membership-light-meta-${t.entity_id.replace(/[^a-zA-Z0-9_-]/g,"-")}`,s=this._isNewDisabled(t);return q`
          <label class="light-row ${s?"new-disabled":""}">
            <input
              type="checkbox"
              data-entity-id=${t.entity_id}
              .checked=${this._pendingSelectedIds.has(t.entity_id)}
              ?disabled=${this._applying||s}
              aria-label=${mt.membership.lightCheckboxLabel(t.name,e)}
              aria-describedby=${i}
              @change=${()=>this._toggle(t)}
            />
            <span>
              <span class="name">${t.name}</span>
              <span class="entity-id"
                ><span id=${i}>${t.entity_id}</span>${e.length>0?` · ${e.join(" · ")}`:""}</span
              >
            </span>
            ${t.area_name?q`<span class="area">${t.area_name}</span>`:K}
          </label>
        `})}`}render(){const t=this._computeView(),{visible:e,visibleSelected:i}=t,s=this._loading||this._applying||!this._loaded,r=this._loaded&&0===this._pendingSelectedIds.size;return q`
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
            <h2 id="membership-title" tabindex="-1">${mt.membership.title}</h2>
            <p id="membership-context">
              <span class="group-name">${this._groupName}</span>
              <span aria-hidden="true"> · </span>${mt.membership.subtitle}
            </p>
          </div>
          <button
            class="close"
            type="button"
            aria-label=${mt.membership.close}
            ?disabled=${this._applying}
            @click=${this._close}
          >
            ×
          </button>
        </header>

        <div class="controls">
          <div class="filters">
            <label class="field">
              <span class="field-label">${mt.membership.search}</span>
              <input
                id="membership-search"
                type="search"
                placeholder=${mt.membership.searchPlaceholder}
                .value=${this._search}
                ?disabled=${s}
                @input=${t=>{this._search=t.target.value}}
              />
            </label>
            <label class="field">
              <span class="field-label">${mt.membership.areaFilter}</span>
              <select
                .value=${this._areaId}
                ?disabled=${s}
                @change=${t=>{this._areaId=t.target.value}}
              >
                <option value="">${mt.membership.allAreas}</option>
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
                    ?disabled=${s}
                    @change=${t=>{this._currentGroupOnly=t.target.checked}}
                  />
                  <span>${mt.membership.currentGroupOnly(this._initialMemberIds.size)}</span>
                </label>`:K}
            ${this._loaded&&"v1"===this._metadataMode?q`<label class="scope-option">
                  <input
                    class="exceptional-filter"
                    type="checkbox"
                    .checked=${this._showExceptional}
                    ?disabled=${s}
                    @change=${t=>{this._showExceptional=t.target.checked}}
                  />
                  <span>${mt.membership.showExceptional(t.exceptionalCount)}</span>
                </label>`:K}
          </div>

          ${this._loaded&&!this._loadError?q`<div class="result-summary">
                  ${mt.membership.resultSummary(e.length,i,this._pendingSelectedIds.size)}
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
          aria-label=${mt.membership.candidateList}
          aria-busy=${this._loading?"true":"false"}
        >
          ${this._renderList(t)}
        </div>

        <footer>
          ${this._applyError?q`<div class="error apply-error" role="alert" aria-live="assertive" tabindex="-1">
                ${this._applyError}
              </div>`:r?q`<div class="error selection-error" role="status">
                  ${mt.membership.emptyError}
                </div>`:K}
          ${this._applying?q`<span class="sr-only applying-status" role="status" aria-live="polite"
                >${mt.membership.applyingStatus}</span
              >`:K}
          <span class="count">${mt.membership.selectedCount(this._pendingSelectedIds.size)}</span>
          <button class="action" type="button" ?disabled=${this._applying} @click=${this._close}>
            ${mt.membership.cancel}
          </button>
          <button
            class="action primary"
            type="button"
            ?disabled=${s||r||!this._hasChanges||this._applyBlockedByConflict}
            @click=${this._apply}
          >
            ${this._applying?mt.membership.applying:this._applyError&&!this._applyBlockedByConflict?mt.membership.tryAgain:mt.membership.apply}
          </button>
        </footer>
      </section>
    `}}function is(t){return null===t?mt.restoration.unavailable:"number"==typeof t?mt.restoration.brightness(t):"off"===t?mt.restoration.off:mt.restoration.on}es.RESULT_ANNOUNCEMENT_DELAY_MS=250,es.styles=a`
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
  `,t([vt({attribute:!1})],es.prototype,"hass",void 0),t([vt({type:String})],es.prototype,"groupEntityId",void 0),t([vt({attribute:!1})],es.prototype,"beginApply",void 0),t([gt()],es.prototype,"_lights",void 0),t([gt()],es.prototype,"_observedOrder",void 0),t([gt()],es.prototype,"_pendingSelectedIds",void 0),t([gt()],es.prototype,"_metadataMode",void 0),t([gt()],es.prototype,"_search",void 0),t([gt()],es.prototype,"_areaId",void 0),t([gt()],es.prototype,"_currentGroupOnly",void 0),t([gt()],es.prototype,"_showExceptional",void 0),t([gt()],es.prototype,"_loading",void 0),t([gt()],es.prototype,"_applying",void 0),t([gt()],es.prototype,"_loadError",void 0),t([gt()],es.prototype,"_applyError",void 0),t([gt()],es.prototype,"_applyErrorCode",void 0),t([gt()],es.prototype,"_announcedResultSummary",void 0),Ce("light-membership-dialog",es);class ss extends ct{constructor(){super(...arguments),this.rows=[],this.actionable=!1,this.token="",this._selected=new Set}firstUpdated(){this.renderRoot.querySelector("dialog")?.showModal()}_close(){this.dispatchEvent(new CustomEvent("restoration-close"))}willUpdate(t){t.has("token")&&this._selected.clear()}render(){return q`<dialog
      aria-labelledby="restoration-title"
      @cancel=${t=>{t.preventDefault(),this._close()}}
    >
      <h2 id="restoration-title">${mt.restoration.title}</h2>
      <p>${mt.restoration.receiptHelp}</p>
      <p>${mt.restoration.overwriteHelp}</p>
      <ul>
        ${this.rows.map(t=>q`<li>
              <label
                ><input
                  type="checkbox"
                  ?disabled=${!this.actionable||!t.eligible}
                  .checked=${this._selected.has(t.entityId)}
                  @change=${e=>{e.target.checked?this._selected.add(t.entityId):this._selected.delete(t.entityId),this.requestUpdate()}}
                /><span
                  >${t.name}<small>${t.entityId}</small
                  ><small
                    >Prior: ${is(t.before)} · Current: ${is(t.current)}</small
                  ><small
                    >${mt.restoration.outcomes[t.outcome]}${t.pending?` · ${mt.restoration.pending}`:""}</small
                  ></span
                ></label
              >
            </li>`)}
      </ul>
      <p>${mt.restoration.keepHelp}</p>
      <footer>
        <button @click=${()=>this._close()}>${mt.restoration.close}</button
        ><button
          ?disabled=${!this.actionable}
          @click=${()=>this.dispatchEvent(new CustomEvent("restoration-keep",{detail:{token:this.token}}))}
        >
          ${mt.restoration.keep}</button
        ><button
          ?disabled=${!this.actionable||0===this._selected.size}
          @click=${()=>this.dispatchEvent(new CustomEvent("restoration-restore",{detail:{token:this.token,selected:[...this._selected]}}))}
        >
          ${mt.restoration.restore}
        </button>
      </footer>
    </dialog>`}}ss.styles=a`
    dialog {
      color: var(--primary-text-color, #ddd);
      background: var(--card-background-color, #1c1c1c);
      border: 1px solid var(--divider-color, #555);
      border-radius: 8px;
      width: min(560px, calc(100vw - 48px));
      max-height: calc(100dvh - 48px);
      box-sizing: border-box;
      padding: 20px;
      font: inherit;
    }
    dialog::backdrop {
      background: rgb(10 15 18 / 0.58);
    }
    h2 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    p {
      font-size: 13px;
      line-height: 1.5;
    }
    ul {
      padding: 0;
      list-style: none;
    }
    li {
      padding: 12px 0;
      border-top: 1px solid var(--divider-color, #555);
      overflow-wrap: anywhere;
    }
    label {
      display: flex;
      gap: 8px;
      align-items: start;
    }
    small {
      display: block;
      margin: 4px 0;
      color: var(--secondary-text-color, #aaa);
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      gap: 8px;
    }
    button {
      font: inherit;
      color: inherit;
      background: transparent;
      border: 1px solid var(--divider-color, #555);
      border-radius: 6px;
      min-height: 40px;
      padding: 8px;
    }
    button:disabled {
      opacity: 0.5;
    }
    input {
      flex: none;
    }
  `,t([vt({attribute:!1})],ss.prototype,"rows",void 0),t([vt({type:Boolean})],ss.prototype,"actionable",void 0),t([vt({type:String})],ss.prototype,"token",void 0),Ce("preview-restoration-dialog",ss);class rs extends Error{}const ns=new WeakMap;"undefined"!=typeof window&&(function(){const t=globalThis.CSS;if(t?.registerProperty)try{t.registerProperty({name:"--curve-graph-max-height",syntax:"<length-percentage>",inherits:!0,initialValue:"520px"})}catch{}}(),window.__LIGHTENER_CURVE_CARD_VERSION__="2.18.0",function(t,e){if(void 0===t.customCards&&(t.customCards=[]),!Array.isArray(t.customCards))return;const i=t.customCards;i.some(t=>t?.type===e.type)||i.push(e)}(window,{type:Ie,name:"Lightener Studio",description:"Shape how each light responds to group brightness.",documentationURL:"https://github.com/florianhorner/lightener-studio#readme",preview:!0,getEntitySuggestion:function(t,e){return ke(t,e)?{config:{type:$e,entity:e}}:null}}));const os=q`<svg
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
</svg>`;const as=["light"];class ls extends ct{constructor(){super(...arguments),this._config={},this._hass=null,this._picker=new Se(()=>this.isConnected,()=>this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._picker.ensureLoaded()}setConfig(t){this._config=t,this._picker.ensureLoaded()}set hass(t){this._hass=t,this._picker.ensureLoaded()}_fireConfigChanged(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_commitConfigKey(t,e){const i=Object.fromEntries(Object.entries(this._config).filter(([e])=>e!==t));this._config=e?{...i,[t]:e}:i,this._fireConfigChanged()}_onEntityChange(t){this._commitConfigKey("entity",t.detail?.value??"")}_onTitleChange(t){this._commitConfigKey("title",t.target.value)}_onFallbackEntityInput(t){this._commitConfigKey("entity",t.target.value.trim())}render(){const t=this._config.entity??"",e=this._config.title??"",i=this._hass?function(t){const e=t.entities;return e?Object.keys(e).filter(e=>ke(t,e)):[]}(this._hass):[];return q`
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
      aria-label=${t.ariaLabel??K}
      @value-changed=${t.onValueChanged}
    ></ha-entity-picker>`:"change"===(t.fallbackEvent??"input")?q`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??K}
        aria-label=${t.ariaLabel??K}
        @change=${t.onFallbackInput}
      />`:q`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??K}
        aria-label=${t.ariaLabel??K}
        @input=${t.onFallbackInput}
      />`}({ready:this._picker.ready,hass:this._hass,value:t,includeDomains:as,includeEntities:i.length?i:void 0,placeholder:"light.your_lightener_group",fallbackEvent:"change",onValueChanged:this._onEntityChange,onFallbackInput:this._onFallbackEntityInput})}
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
    `}}ls.styles=a`
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
  `,t([gt()],ls.prototype,"_config",void 0),t([gt()],ls.prototype,"_hass",void 0),Ce("lightener-curve-card-editor",ls);class hs extends ct{constructor(){super(...arguments),this.experimentalFirstUse=!1,this.canvasHelp=!1,this._canvasHelpNotice=null,this._canvasHelpNoticeTimer=null,this._invitation=new we(()=>this.requestUpdate()),this._invitationAutoAllowed=!1,this._invitationVisible=!1,this._invitationGraph=null,this._invitationObserver=null,this._invitationStartTimer=null,this._invitationMotionUnsubscribe=null,this._invitationInput="mouse",this._invitationHintTimer=null,this._invitationEditHint=null,this._invitationTogether=!1,this._curves=[],this._originalCurves=[],this._config={},this._selectedCurveId=null,this._sessionStateInitialized=!1,this._saveState=yi,this.draftSurface="dashboard",this._draftPrincipal=null,this._identityAvailable=!1,this._draftOwner=crypto.randomUUID(),this._draftClaim=null,this._claimedScope=null,this._resumeTicket=null,this._draftUnsubscribe=null,this._knownEntryId=null,this._suppressDraftCapture=!1,this._writeReview={kind:"live"},this._draftLost=!1,this._savedRead=null,this._draftNotice=null,this._resumeUnverified=!1,this._authInvalidated=!1,this._resumePayload=null,this._verifyAfterDiscard=!1,this._pendingRecoveryClaim=null,this._draftSubscriptionKey="",this._pendingDraftWrite=null,this._retainedReview=null,this._identityUnavailableRuntimeEntries=new Set,this._contextGeneration=0,this._loadGeneration=0,this._recoveryGeneration=0,this._baseline=null,this._rawBaseline=null,this._membershipBaseline=null,this._submittedIntent=null,this._saveIssue=null,this._saveReview=null,this._load=wi,this._manageError=null,this._managingLights=!1,this._groupDeleted=!1,this._scrubberPosition=null,this._cancelAnimating=!1,this._joy=zt,this._drawIn=null,this._drawInToken=0,this._drawInTimer=null,this._drawInWaitingForVisible=!1,this._unsubscribeDrawInMotion=null,this._boundStopDrawIn=t=>{"pointerdown"===t?.type&&this._drawInWaitingForVisible||this._stopDrawIn()},this._drawOut=null,this._drawOutToken=0,this._drawOutTimer=null,this._ripple=null,this._cancelRippleLoop=null,this._morphLine=null,this._hass=null,this._undoStack=[],this._editGesture=null,this._narrowLayout=!1,this.toolbarHost=null,this._activeToolbarHost=null,this._pendingCommandFocus=null,this._commandFocusVersion=0,this._onToolbarInteraction=t=>{t.isTrusted&&this._coach.interrupt()},this._layoutObserver=null,this._layoutNodes=[],this._pendingNarrowLayout=null,this._boundKeyHandler=null,this._boundBeforeUnload=null,this._boundFooterOverlaySync=null,this._footerOverlayFrame=null,this._footerScrollRoots=[],this._saveGuard=new bi({dispatchSave:t=>this._dispatchSave(t),getSavePhase:()=>this._saveState.phase}),this._cancelAnimFrame=null,this._curveAnimationGeneration=0,this._previewActive=!1,this._restorationOpen=!1,this._restorationFocus=null,this._hoveredCurveId=null,this._presetGraphTrial=null,this._pendingPresetGraphTrial=null,this._hoveredPresetGraphTrial=null,this._focusedPresetGraphTrial=null,this._membershipOpen=!1,this._membershipStatus=null,this._membershipStatusTimer=null,this._coach=new li({isReady:()=>this._load.loaded&&void 0!==this._selectedCurve,setTrial:t=>this._setPresetGraphTrial(t),clearTrial:()=>this._clearPresetGraphTrial(),requestUpdate:()=>this.requestUpdate()}),this._lastPresetPointerType=null,this._previewController=new oi({getHass:()=>this._authInvalidated?null:this._hass,canDispatch:()=>this.isConnected&&this._isAdmin&&!this._runtimeBlocked&&!this._authInvalidated,restorationChanged:()=>this.requestUpdate(),getCurves:()=>this._curves,getScrubberPosition:()=>this._effectiveScrubberPosition,setScrubberPosition:t=>{this._scrubberPosition=t},getStorageEntityId:()=>this._storageEntityId,getConfigEntryId:()=>this._knownEntryId??this._baseline?.config_entry_id,persistScrubberPosition:(t,e)=>{this._writeStoredState(t,{scrubberPosition:e})},setPreviewActive:t=>{this._previewActive=t}}),this._lastEmittedDirtyState=!1,this._dirtyVersion=0,this._cleanVersion=0,this._onInvitationControl=t=>{(this.experimentalFirstUse||this.canvasHelp)&&(t.composedPath().some(t=>t instanceof Element&&("curve-graph"===t.localName||t.classList.contains("invitation-dismiss")))||t instanceof KeyboardEvent&&["Tab","Shift","Escape"].includes(t.key)||this._dismissInvitation())},this._onInvitationVisibility=()=>{document.hidden&&(this._hoveredCurveId=null,this._dismissInvitation())},this._onGraphPointerDown=t=>{if(0!==t.button)return;const e=this._liveRipple;if(!e)return;const i=t.composedPath()[0]?.getAttribute?.("data-curve");null!=i&&this._curves[Number(i)]?.entityId===e.entityId&&this._stopRipple()},this._onPreviewToggle=()=>{(this._canEditCurves||this._previewActive)&&(this._endLightGesture(),this._dismissInvitation(),this._clearPresetGraphTrial(),this._previewActive?this._stopPreview():this._startPreview())},this._startPreview=()=>{this._previewController.start()},this._stopPreview=()=>{this._previewController.stop()},this._onDrawInWaiting=t=>{this._drawIn&&t.detail?.token===this._drawIn.token&&(this._drawInWaitingForVisible=!0,null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=null)},this._onDrawInStarted=t=>{this._drawIn&&t.detail?.token===this._drawIn.token&&(this._drawInWaitingForVisible=!1,null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=setTimeout(this._boundStopDrawIn,function(t){const e=Number.isFinite(t)?Math.max(0,Math.trunc(t)):0,i=qt+40*Math.max(0,e-1)+150;return Math.max(1200,i)}(t.detail.pointCount)))}}_captureWriteReview(t){return t?{principal:{origin:t.origin,userId:t.userId,authEpoch:t.authEpoch},entry:t.configEntryId,generation:Je.writeGeneration(t,t.configEntryId)}:null}_writeReviewCurrent(t){if(!t)return!this._draftScope();const e=this._draftScope();return!!e&&e.origin===t.principal.origin&&e.userId===t.principal.userId&&e.authEpoch===t.principal.authEpoch&&e.configEntryId===t.entry&&Je.isCurrent(t.principal)&&Je.writeGeneration(t.principal,t.entry)===t.generation}get _saving(){return"saving"===(t=this._saveState).phase||"confirming"===t.phase;var t}get _saveSuccess(){return"saved"===this._saveState.phase}get _saveError(){return"error"===(t=this._saveState).phase?t.message:null;var t}_dispatchSave(t){const e="confirming"===this._saveState.phase;this._saveState=function(t,e){switch(e.type){case"reset":return{phase:"idle"};case"dirty":return"idle"===t.phase?{phase:"dirty"}:t;case"save-start":return"saving"===t.phase||"confirming"===t.phase?t:{phase:"saving"};case"save-success":return"saving"!==t.phase?t:{phase:"confirming"};case"save-confirmed":return"confirming"!==t.phase?t:{phase:"saved"};case"save-error":return"saving"!==t.phase&&"confirming"!==t.phase?t:{phase:"error",message:e.message};case"save-clear":return"saved"===t.phase||"error"===t.phase?{phase:"idle"}:t}}(this._saveState,t),"save-start"===t.type&&"saving"===this._saveState.phase&&this._clearMembershipStatus(),"confirming"!==this._saveState.phase&&"saving"!==this._saveState.phase&&this._saveGuard.onLeaveConfirming(this._saveState.phase,e)}get _dragActive(){return null!==this._editGesture}get _lightGesture(){return"light"===this._editGesture?.kind?this._editGesture:null}get _lastPreviewTime(){return this._previewController.lastPreviewTime}set _lastPreviewTime(t){this._previewController.lastPreviewTime=t}get _embedded(){return!0===this._config.embedded}get _hostedToolbar(){return!!this.toolbarHost?.isConnected}_clearToolbarHost(){const t=this._activeToolbarHost;t&&(t.removeEventListener("pointerdown",this._onInvitationControl,!0),t.removeEventListener("keydown",this._onInvitationControl,!0),t.removeEventListener("pointerdown",this._boundStopDrawIn,!0),t.removeEventListener("keydown",this._boundStopDrawIn,!0),t.removeEventListener("click",this._boundStopDrawIn,!0),t.removeEventListener("pointerdown",this._onToolbarInteraction,!0),t.removeEventListener("keydown",this._onToolbarInteraction,!0),t.removeEventListener("focusin",this._onToolbarInteraction,!0)),t&&ns.get(t)===this&&(ht(K,t),t.hidden=!0,ns.delete(t)),this._activeToolbarHost=null}_syncToolbarHost(){const t=this.isConnected&&this._hostedToolbar?this.toolbarHost:null;if(this._activeToolbarHost!==t&&this._clearToolbarHost(),!t)return;const e=ns.get(t);e&&e!==this&&(e.toolbarHost=null,e._clearToolbarHost()),this._activeToolbarHost!==t&&(t.addEventListener("pointerdown",this._onInvitationControl,!0),t.addEventListener("keydown",this._onInvitationControl,!0),t.addEventListener("pointerdown",this._boundStopDrawIn,!0),t.addEventListener("keydown",this._boundStopDrawIn,!0),t.addEventListener("click",this._boundStopDrawIn,!0),t.addEventListener("pointerdown",this._onToolbarInteraction,!0),t.addEventListener("keydown",this._onToolbarInteraction,!0),t.addEventListener("focusin",this._onToolbarInteraction,!0)),ns.set(t,this),this._activeToolbarHost=t,t.hidden=!1,ht(q`<style>
          ${fi.cssText}</style
        >${this._renderHelp()}`,t)}static getConfigElement(){return document.createElement("lightener-curve-card-editor")}static getStubConfig(){return{type:$e}}setConfig(t){const e=t.entity!==this._config.entity;e&&(this._previewController.disconnect(),this._closeRestoration(),this._managingLights=!1,this._leaveDraftContext(),this._knownEntryId=null,this._draftOwner=crypto.randomUUID(),this._draftLost=!1,this._savedRead=null,this._resumeUnverified=!1,this._resumePayload=null,this._verifyAfterDiscard=!1,this._writeReview={kind:"live"},this._suppressDraftCapture=!1,this._draftNotice=null,this._endLightGesture(!1),this._dismissInvitation(),this._clearCanvasHelpNotice(),this._hoveredCurveId=null);const i=!0===t.firstRun;this._config=t,this._joy=function(t){if(null===t||"object"!=typeof t||Array.isArray(t))return zt;const e=t,i={...zt};for(const t of Bt){const s=e[t];"boolean"==typeof s&&(i[t]=s)}return Object.freeze(i)}(t.joy),!e&&this._joy.ripple||this._stopRipple(),!e&&this._joy.draw_in||(this._stopDrawIn(),this._stopDrawOut()),e?(this._contextGeneration++,this._loadGeneration++,this._baseline=null,this._rawBaseline=null,this._membershipBaseline=null,this._saveIssue=null,this._saveReview=null,this._submittedIntent=null,this._saveGuard.settleError(),this._saveGuard.dispose(),this._dispatchSave({type:"reset"}),this._load={...this._load,loading:!1},this._stopCurveAnimation(),this._clearMembershipStatus(),this._previewActive&&this._stopPreview(),this._setMembershipOpen(!1),this._editGesture=null,this._load=function(t){return{...t,loaded:!1,loadedEntityId:void 0,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._groupDeleted=!1,this._clearPresetGraphTrial(),this._selectedCurveId=null,this._scrubberPosition=null,this._sessionStateInitialized=!1,this._undoStack=[],this._invitationAutoAllowed=!1,this._invitationEditHint=null,this._invitationTogether=!1,this._coach.configure(i&&!this.experimentalFirstUse,!0),this._cleanVersion=this._dirtyVersion,this._tryLoadCurves()):this._coach.configure(i&&!this.experimentalFirstUse,!1)}set hass(t){const e=!!this._hass,i=this._identityAvailable,s=t.user?.id?.trim();if(this._identityAvailable=!!s,s){const t=this._draftPrincipal,e=Je.activatePrincipal(location.origin,s);!t||t.userId===e.userId&&t.authEpoch===e.authEpoch||this._invalidateDraftIdentity(),this._draftPrincipal=e;for(const t of this._identityUnavailableRuntimeEntries)Je.markRuntimeBlocked(e,t);this._identityUnavailableRuntimeEntries.clear(),this._identityAvailable=!0,this._authInvalidated=!1}this._hass=t,this.isConnected?this._previewController.connect():this._previewController.observe(),!this._isAdmin&&this._retainedReview&&this._dismissSaveReview(),!this._isAdmin&&this._pendingRecoveryClaim&&(Je.release(this._pendingRecoveryClaim.scope,this._pendingRecoveryClaim.claim),this._pendingRecoveryClaim=null,this._recoveryGeneration++,this._savedRead=null),this._subscribeDraft(),this._isDirty&&this._identityAvailable&&!i&&this._checkpointDraft(),this._isAdmin||this._endLightGesture(!1),e&&this._load.loaded||this._dragActive||this._tryLoadCurves()}getCardSize(){return 4}getGridOptions(){return{columns:12,rows:9,min_columns:6,min_rows:6}}get _isAdmin(){return this._hass?.user?.is_admin??!1}get _entityId(){return this._config.entity}get _storageEntityId(){return this._load.loadedEntityId??this._entityId}get _isDirty(){return this._dirtyVersion!==this._cleanVersion}get _membershipLocked(){return this._membershipOpen||this._managingLights}get _canEditCurves(){return!this._cancelAnimating&&this._canUndoCurves}get _canUndoCurves(){return this._isAdmin&&!this._saving&&!this._membershipLocked&&!this._load.loadError&&this._load.loadedEntityId===this._entityId&&!this._groupDeleted&&!this._runtimeBlocked&&!this._draftLost&&!this._savedRead&&!this._resumeUnverified&&!this._draftAuthStale&&!this._saveReview}get _draftAuthStale(){return this._authInvalidated||!!this._draftPrincipal&&!Je.isCurrent(this._draftPrincipal)}_draftScope(){return this._identityAvailable&&this._draftPrincipal&&Je.isCurrent(this._draftPrincipal)&&this._knownEntryId?{...this._draftPrincipal,configEntryId:this._knownEntryId,surface:this.draftSurface}:null}get _draftWriteNeedsReview(){const t=this._draftScope();return!!t&&("live"!==this._writeReview.kind||Je.hasUnknownWrite(t,t.configEntryId))&&!("accepted"===this._writeReview.kind&&this._writeReviewCurrent(this._writeReview.stamp))&&Je.hasUnresolvedWrite(t,t.configEntryId)}_beginSavedRead(){return this._savedRead={context:this._contextGeneration,generation:++this._recoveryGeneration}}_ownsSavedRead(t){return this._savedRead===t&&t.context===this._contextGeneration&&t.generation===this._recoveryGeneration}_finishSavedRead(t){this._ownsSavedRead(t)&&(this._savedRead=null)}async _readLatestSaved(t,e,i){const s=this._captureWriteReview(this._draftScope()),r=()=>{if(!t())return!1;if(!this._writeReviewCurrent(s))throw new rs(mt.drafts.savedChanged);return!0},n=await this._hass.callWS({type:"lightener/get_curves",entity_id:this._entityId});if(!r())return null;const o=De(n);if(!o||e&&o.config_entry_id!==e)throw new rs(i);return{latest:o,curves:Pe(o.entities,this._hass.states,Mt),writeReview:s,valid:r}}_subscribeDraft(){const t=this._draftScope(),e=t?JSON.stringify(t):"";this._draftSubscriptionKey===e&&this._draftUnsubscribe||(this._draftUnsubscribe?.(),this._draftUnsubscribe=null,this._draftSubscriptionKey="",t&&this.isConnected&&(this._draftSubscriptionKey=e,Je.hasUnresolvedWrite(t,t.configEntryId)&&(this._writeReview={kind:"required"}),this._draftUnsubscribe=Je.subscribe(t,()=>{Je.isCurrent(t)||this._invalidateDraftIdentity(),this._runtimeBlocked&&(this._previewController.disconnect(),this._saveReview&&this._dismissSaveReview()),this.requestUpdate()})))}_invalidateDraftIdentity(){this._authInvalidated=!0,this._managingLights=!1,this._closeRestoration(),this._writeReview={kind:"live"},this._previewController.disconnect(),this._draftUnsubscribe?.(),this._draftUnsubscribe=null,this._draftSubscriptionKey="",this._contextGeneration++,this._loadGeneration++,this._recoveryGeneration++,this._saveGuard.settleError(),this._saveGuard.dispose(),this._stopCurveAnimation(),this._curves=[],this._originalCurves=[],this._undoStack=[],this._baseline=null,this._rawBaseline=null,this._membershipBaseline=null,this._knownEntryId=null,this._draftClaim=null,this._claimedScope=null,this._resumeTicket=null,this._resumePayload=null,this._resumeUnverified=!1,this._pendingRecoveryClaim=null,this._retainedReview=null,this._draftPrincipal=null,this._identityAvailable=!1,this._draftLost=!1,this._savedRead=null,this._saveReview=null,this._saveIssue=null,this._submittedIntent=null,this._dirtyVersion++,this._cleanVersion=this._dirtyVersion,this._identityUnavailableRuntimeEntries.clear(),this._dispatchSave({type:"reset"}),this._load={...wi}}_draftPayload(){const t=this._runtimeBlocked?"runtime":this._saving||"uncertain"===this._saveIssue||this._draftWriteNeedsReview?"unknown":this._membershipBaseline||"reread"===this._saveIssue?"reread":"conflict"===this._saveIssue?"conflict":"incompatible"===this._saveIssue?"unsupported":"ordinary";return{schema:1,entityId:this._entityId,baselineRevision:this._membershipBaseline?null:this._baseline?.revision??null,baseline:Ve(this._originalCurves),local:Ve(this._curves),undo:this._undoStack.map(Ve),outcome:t}}_checkpointDraft(){if(this._suppressDraftCapture||this._draftLost||this._retainedReview||this._resumeUnverified)return;const t=this._draftScope(),e=!qe(Ve(this._originalCurves),Ve(this._curves));if(!t)return void(e&&(this._draftNotice=mt.drafts.unavailable));if(this._draftClaim&&this._claimedScope&&!Je.owns(this._claimedScope,this._draftClaim))return void(this._draftLost=!0);if(!e)return this._draftClaim&&this._claimedScope&&Je.clear(this._claimedScope,this._draftClaim),this._draftClaim=null,void(this._claimedScope=null);const i=this._draftClaim?Je.update(t,this._draftClaim,this._draftPayload()):Je.create(t,this._draftOwner,this._draftPayload());i.ok?(this._draftClaim=i.value,this._claimedScope=t,this._draftNotice=null):(i.claim&&(this._draftClaim=i.claim),this._draftNotice=mt.drafts.notRetained)}_leaveDraftContext(t=!1){if(this._checkpointDraft(),t&&(this._writeReview={kind:"required"}),this._pendingRecoveryClaim&&Je.release(this._pendingRecoveryClaim.scope,this._pendingRecoveryClaim.claim),this._pendingRecoveryClaim=null,this._pendingDraftWrite&&Je.settleWrite(this._pendingDraftWrite.principal,this._pendingDraftWrite.entry,this._pendingDraftWrite.id,"unknown"),this._retainedReview&&!this._retainedReview.localCopy&&Je.release(this._retainedReview.scope,this._retainedReview.claim),this._retainedReview=null,this._draftClaim&&this._claimedScope){const e=Je.release(this._claimedScope,this._draftClaim);this._resumeTicket=t?e:null}this._draftClaim=null,t||(this._claimedScope=null,this._resumeTicket=null),this._draftUnsubscribe?.(),this._draftUnsubscribe=null,this._draftSubscriptionKey=""}discardNavigationDraft(){this._draftClaim&&this._claimedScope&&Je.clear(this._claimedScope,this._draftClaim),this._draftClaim=null,this._claimedScope=null,this._resumeTicket=null,this._draftLost=!1,this._suppressDraftCapture=!0,this._resumePayload=null,this._draftNotice=null}_curvesFromGeometry(t){const e=new Map(this._curves.map(t=>[t.entityId,t]));return t.map(t=>({entityId:t.entityId,friendlyName:this._hass?.states[t.entityId]?.attributes.friendly_name??t.entityId,visible:e.get(t.entityId)?.visible??!0,color:e.get(t.entityId)?.color??Mt[0],controlPoints:t.points.map(t=>({...t}))}))}async _resumeNavigationDraft(){this._writeReview={kind:"required"};const t=this._claimedScope,e=this._resumeTicket;if(!(t&&e&&this._hass&&this._draftScope()))return void(e&&(this._draftLost=!0));const i=Je.resume(t,e);if(this._resumeTicket=null,!i.ok)return this._draftLost=!0,void(this._draftNotice=mt.drafts.openedElsewhere);this._draftClaim=i.value.claim,this._resumePayload=i.value.payload,this._resumeUnverified=!0,await this._readNavigationDraft(t,i.value.claim,i.value.payload,!0)}async _recoverNavigationDraft(t){this._writeReview={kind:"required"};const e=this._draftScope();if(!e||this._isDirty||this._savedRead||!this._isAdmin)return;const i=Je.claim(e,t.draftId,t.version,this._draftOwner);if(!i.ok)return this._draftNotice=mt.drafts.changed,void this.requestUpdate();this._pendingRecoveryClaim={scope:e,claim:i.value.claim},await this._readNavigationDraft(e,i.value.claim,i.value.payload,!1)}async _readNavigationDraft(t,e,i,s){if(!this._hass)return;const r=this._beginSavedRead(),n=this._draftOwner,o=()=>this.isConnected&&this._ownsSavedRead(r)&&n===this._draftOwner&&Je.isCurrent(t)&&Je.owns(t,e)&&this._isAdmin&&JSON.stringify(this._draftScope())===JSON.stringify(t);try{const r=await this._readLatestSaved(o,t.configEntryId,mt.drafts.unavailableSaved);if(!r?.valid())return void Je.release(t,e);const{latest:n,curves:a,writeReview:l}=r,h=qe(i.baseline,Ve(a)),d=t=>JSON.stringify(t.map(t=>t.entityId))===JSON.stringify(i.baseline.map(t=>t.entityId)),c="ordinary"===i.outcome&&i.baselineRevision===n.revision&&!Je.hasUnresolvedWrite(t,t.configEntryId);if(c&&(!h||!d(i.local)||i.undo.some(t=>!d(t))))throw new rs(mt.drafts.inconsistent);"runtime"===i.outcome&&Je.markRuntimeBlocked(t,t.configEntryId);const p=Je.isRuntimeBlocked(t,t.configEntryId);if(p&&(!h||i.baselineRevision!==n.revision||!d(i.local)||i.undo.some(t=>!d(t))))throw new rs(mt.drafts.unavailableSaved);if(c||p)this._draftClaim=e,this._claimedScope=t,this._knownEntryId=t.configEntryId,s||(this._curves=this._curvesFromGeometry(i.local),this._originalCurves=Ae(a),this._undoStack=i.undo.map(t=>this._curvesFromGeometry(t)),this._dirtyVersion++,this._cleanVersion=this._dirtyVersion-1),this._baseline=n,this._rawBaseline=n.entities,this._saveIssue=Je.isRuntimeBlocked(t,t.configEntryId)?"runtime":null,this._draftNotice=null,this._resumeUnverified=!1,this._resumePayload=null,this._pendingRecoveryClaim=null,this._suppressDraftCapture=!1;else if(s)this._resumeUnverified=!0,this._baseline=null,this._submittedIntent=null,this._saveIssue="unknown"===i.outcome?"uncertain":"conflict";else{this._pendingRecoveryClaim=null,this._retainedReview={scope:t,claim:e,payload:i,localCopy:!1};const s=this._curvesFromGeometry(i.baseline),r=this._curvesFromGeometry(i.local);this._saveReview={writeReview:l,latest:n,curves:a,members:He(s,r,a)}}}catch(i){o()&&(this._draftNotice=i instanceof rs?i.message:mt.drafts.unavailableSaved,s&&(this._resumeUnverified=!0,this._baseline=null,this._saveIssue="reread")),s||Je.release(t,e)}finally{this._pendingRecoveryClaim?.claim.draftId===e.draftId&&this._pendingRecoveryClaim.claim.claimEpoch===e.claimEpoch&&(Je.release(t,e),this._pendingRecoveryClaim=null),this._finishSavedRead(r)}}async _retryNavigationResume(){!this._isAdmin||this._savedRead||this._draftAuthStale||(this._claimedScope&&this._draftClaim&&this._resumePayload?await this._readNavigationDraft(this._claimedScope,this._draftClaim,this._resumePayload,!0):this._entityId&&this._reloadCurvesAfterCurrentLoad(this._entityId))}async _discardOrphanDraft(t){const e=this._draftScope();if(!e||this._isDirty)return;const i=Je.claim(e,t.draftId,t.version,this._draftOwner);i.ok?Je.clear(e,i.value.claim):this._draftNotice=mt.drafts.changed,this.requestUpdate()}async _reviewLostLocalCopy(){if(this._writeReview={kind:"required"},!this._draftLost||!this._hass||!this._draftScope()||!this._isAdmin||this._savedRead)return;const t=this._draftScope(),e=this._beginSavedRead(),i=this._draftOwner,s=()=>this._draftLost&&this.isConnected&&this._ownsSavedRead(e)&&i===this._draftOwner&&this._isAdmin&&Je.isCurrent(t)&&JSON.stringify(this._draftScope())===JSON.stringify(t);try{const e=await this._readLatestSaved(s,t.configEntryId,mt.drafts.unavailableSaved);if(!e?.valid())return;const{latest:i,curves:r,writeReview:n}=e;this._retainedReview={scope:t,claim:{draftId:"",ownerId:this._draftOwner,claimEpoch:0,version:0},payload:this._draftPayload(),localCopy:!0},this._saveReview={writeReview:n,latest:i,curves:r,members:He(this._originalCurves,this._curves,r)}}catch{s()&&(this._draftNotice=mt.drafts.unavailableSaved)}finally{this._finishSavedRead(e)}}_renderNavigationDrafts(){const t=this._draftScope(),e=t&&this._isAdmin&&!this._isDirty&&!this._savedRead&&!this._draftClaim&&this._baseline?Je.list(t):[];return this._resumeUnverified||this._draftNotice||!t&&this._isDirty||this._draftLost||this._draftWriteNeedsReview||e.length?q`<div class="navigation-drafts">
      ${this._resumeUnverified?q`<span role="status"
            >${mt.drafts.unverified}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead||!this._isAdmin}
              @click=${()=>this._retryNavigationResume()}
            >
              ${mt.guardedSave.check}
            </button></span
          >`:K}${this._draftNotice?q`<span role="status">${this._draftNotice}</span>`:!t&&this._isDirty?q`<span role="status">${mt.drafts.unavailable}</span>`:K}
      ${this._draftLost?q`<span role="status"
            >${mt.drafts.openedElsewhere}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead}
              @click=${()=>this._reviewLostLocalCopy()}
            >
              ${mt.drafts.reviewLocal}
            </button></span
          >`:K}
      ${this._draftWriteNeedsReview&&!this._draftLost?q`<span role="status"
            >${mt.drafts.unknown}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead||this._runtimeBlocked}
              @click=${()=>this._reviewLatest()}
            >
              ${mt.guardedSave.review}
            </button></span
          >`:K}
      ${e.map(t=>q`<span role="status"
            >${t.complete?mt.drafts.available:mt.drafts.older}
            ${t.affectedIds.map(t=>this._hass?.states[t]?.attributes.friendly_name??t).join(", ")}
            · ${t.affectedIds.length}
            ${1===t.affectedIds.length?mt.drafts.changedLight:mt.drafts.changedLights} ·
            ${new Date(t.updatedAt).toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:3})}<button
              class="command-retry"
              type="button"
              data-draft-recover
              @click=${()=>this._recoverNavigationDraft(t)}
            >
              ${mt.drafts.recover}</button
            ><button
              class="command-retry"
              type="button"
              data-draft-discard
              @click=${()=>this._discardOrphanDraft(t)}
            >
              ${mt.drafts.discard}
            </button></span
          >`)}
    </div>`:K}get _runtimeBlocked(){const t=this._baseline?.config_entry_id??this._knownEntryId;return!!t&&(this._identityUnavailableRuntimeEntries.has(t)||!!this._draftPrincipal&&Je.isRuntimeBlocked(this._draftPrincipal,t))}get _canGuardedSave(){return this._canEditCurves&&!!this._baseline&&!this._membershipBaseline&&!this._saveIssue&&!this._draftWriteNeedsReview&&!this._runtimeBlocked}get _selectedCurve(){if(null!==this._selectedCurveId)return this._curves.find(t=>t.entityId===this._selectedCurveId)}get _canShowPresetGraphTrial(){return!(void 0===this._selectedCurve||this._saving||this._cancelAnimating||this._drawIn||this._membershipLocked||this._previewActive)}get _isShowingPresetGraphTrial(){return null!==this._presetGraphTrial&&this._canShowPresetGraphTrial&&this._liveRipple?.entityId!==this._selectedCurveId}get _graphCurves(){const t=this._invitation.curve;return t?this._curves.map(e=>e.entityId===t.entityId?t:e):this._curves}get _effectiveScrubberPosition(){return this._scrubberPosition??100}get _presetPreviewCurve(){const t=this._selectedCurve;if(!t?.visible)return null;const e=this._liveRipple,i=e?.entityId===t.entityId?e.committed:this._canShowPresetGraphTrial&&this._isShowingPresetGraphTrial?this._presetGraphTrial?.controlPoints:null;return i?{...t,controlPoints:[...i],visible:!0}:null}get _invitationTarget(){const t=t=>{const e=this._hass?.states[t.entityId]?.state;return t.visible&&void 0!==e&&"unavailable"!==e&&"unknown"!==e};return this._curves.find(e=>e.entityId===this._selectedCurveId&&t(e))??this._curves.find(t)}get _canRunInvitation(){const t=this._invitation.curve?this._selectedCurve:this._invitationTarget,e=this.renderRoot.querySelector("curve-graph"),i=t&&this._hass?.states[t.entityId]?.state;return(this.experimentalFirstUse||this.canvasHelp)&&(!e?.interactionActive||!!this._invitation.curve)&&this.isConnected&&this._isAdmin&&this._load.loaded&&this._load.loadedEntityId===this._entityId&&!this._load.loading&&!this._load.loadError&&!this._groupDeleted&&!this._saving&&!this._saveSuccess&&!this._saveError&&!this._isDirty&&!this._cancelAnimating&&!this._membershipLocked&&!this._previewActive&&!this._drawIn&&!this._isShowingPresetGraphTrial&&!!t?.visible&&void 0!==i&&"unavailable"!==i&&"unknown"!==i}_startInvitation(t=!1){if(this._clearInvitationStartTimer(),this.renderRoot.querySelector("curve-graph")?.interactionActive)return;if(t&&!be(this._curves))return void(this._invitationAutoAllowed=!1);const e=this._invitationTarget;this._canRunInvitation&&e&&this._entityId&&(this._selectedCurveId=e.entityId,this._invitationAutoAllowed=!1,this._clearPresetGraphTrial(),this._coach.dismiss(),this._invitationEditHint=null,this._invitationTogether=!1,this._invitation.start(e,this._joy.ripple),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=Kt(()=>this._invitation.freeze()),ye(this._entityId,"seen"))}_dismissInvitation(){if(this._clearInvitationStartTimer(),this._invitationAutoAllowed=!1,!this._invitation.curve)return;const t=this.renderRoot.querySelector("curve-graph"),e=t?.shadowRoot?.activeElement,i=e&&t?.curves[Number(e.getAttribute("data-curve"))],s=i?.controlPoints[Number(e?.getAttribute("data-point"))],r=this._entityId;t?.cancelInteraction(),this._editGesture=null,this._invitation.clear(),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,this._entityId&&ye(this._entityId,"dismissed"),e&&this.updateComplete.then(async()=>{await(t?.updateComplete);const n=this.shadowRoot?.activeElement,o=t?.shadowRoot?.activeElement;let a=document.activeElement;for(;a?.shadowRoot?.activeElement;)a=a.shadowRoot.activeElement;const l=!a||[document.body,document.documentElement,this,t,e].includes(a);r!==this._entityId||!l||n&&n!==t||o&&o!==e||i&&s&&t?.focusPoint(i.entityId,s.lightener)||this._focusHelpButton({preventScroll:!0})})}_finishInvitation(){this._invitation.curve&&(this._invitation.clear(),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,this._entityId&&ye(this._entityId,"completed"),this._invitationTogether=!0,this._invitationEditHint="touch"===this._invitationInput||"pen"===this._invitationInput?mt.invitation.touchAdd:"keyboard"===this._invitationInput?mt.invitation.keyboardAdd:mt.invitation.mouseAdd,null!==this._invitationHintTimer&&clearTimeout(this._invitationHintTimer),this._invitationHintTimer=setTimeout(()=>{this._invitationEditHint=null,this._invitationTogether=!1,this._invitationHintTimer=null},Vt.context),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_focusHelpButton(t){(this._activeToolbarHost??this.renderRoot).querySelector(".canvas-help, .coach-help, .invitation-replay")?.focus(t)}_toggleCanvasHelp(t=!1){if(this._invitation.curve&&!t)return void this._closeCanvasHelp();if(this._hoveredCurveId=null,t&&this._dismissInvitation(),this._clearPresetGraphTrial(),this._clearInvitationStartTimer(),!this._canRunInvitation)return void this._showCanvasHelpNotice(this._isDirty?mt.canvasHelp.draft:this._previewActive?mt.canvasHelp.watching:mt.canvasHelp.busy);this._clearCanvasHelpNotice();const e=this.renderRoot.querySelector("curve-graph"),i=e?.getBoundingClientRect();i&&(i.top<0||i.bottom>window.innerHeight)&&e?.scrollIntoView?.({block:"center",behavior:"instant"}),this._startInvitation()}_closeCanvasHelp(){const t=this.renderRoot.querySelector("curve-graph");this._dismissInvitation(),this.updateComplete.then(async()=>{if(await(t?.updateComplete),!this.isConnected)return;const e=this._activeFocusPath().at(-1);e&&e!==document.body&&e!==this&&e.isConnected||this._focusHelpButton({preventScroll:!0})})}_showCanvasHelpNotice(t){this._clearCanvasHelpNotice(),this._canvasHelpNotice=t,this._canvasHelpNoticeTimer=setTimeout(()=>{this._canvasHelpNoticeTimer=null,this._canvasHelpNotice=null},Vt.context)}_clearCanvasHelpNotice(){null!==this._canvasHelpNoticeTimer&&clearTimeout(this._canvasHelpNoticeTimer),this._canvasHelpNoticeTimer=null,this._canvasHelpNotice=null}_onGraphInteraction(t){"start"===t.detail.phase&&(this._endLightGesture(),this._hoveredCurveId=null),(this.experimentalFirstUse||this.canvasHelp)&&this.requestUpdate(),"start"===t.detail.phase&&(this._clearInvitationStartTimer(),this._invitationAutoAllowed=!1,this._invitationInput=t.detail.input,this._invitation.curve&&this._invitation.freeze())}_clearInvitationStartTimer(){null!==this._invitationStartTimer&&clearTimeout(this._invitationStartTimer),this._invitationStartTimer=null}_scheduleAutomaticInvitation(){if(!this._invitationAutoAllowed||!this._invitationVisible||document.hidden||!this._canRunInvitation)return void this._clearInvitationStartTimer();if(null!==this._invitationStartTimer)return;const t=this._entityId,e=this._invitationGraph;this._invitationStartTimer=setTimeout(()=>{this._invitationStartTimer=null,t===this._entityId&&e===this._invitationGraph&&this._invitationAutoAllowed&&this._invitationVisible&&!document.hidden&&this._startInvitation(!0)},_e)}_syncInvitation(){if(!this.experimentalFirstUse&&!this.canvasHelp)return;const t=this.renderRoot.querySelector("curve-graph");t!==this._invitationGraph&&(this._clearInvitationStartTimer(),this._invitationObserver?.disconnect(),this._invitationGraph=t,this._invitationVisible=!1,t&&"undefined"!=typeof IntersectionObserver?(this._invitationObserver=new IntersectionObserver(t=>{const e=t.find(t=>t.target===this._invitationGraph);if(!e)return;const i=this._invitationVisible;this._invitationVisible=e.isIntersecting&&e.intersectionRatio>=.5,this._invitationVisible?this._scheduleAutomaticInvitation():(this._clearInvitationStartTimer(),(i||this._invitation.curve)&&this._dismissInvitation())},{threshold:[0,.5]}),this._invitationObserver.observe(t)):this._invitationVisible=!!t),this._invitation.curve&&!this._canRunInvitation&&this._dismissInvitation(),this._scheduleAutomaticInvitation()}get _canManageLights(){return this._isAdmin&&!!this._hass&&!!this._entityId&&!this._isDirty&&!this._saving&&!this._cancelAnimating&&!this._load.loading&&!this._membershipLocked&&!this._load.loadError&&!this._groupDeleted&&!this._runtimeBlocked&&!this._draftLost&&!this._savedRead&&!this._resumeUnverified&&!this._draftAuthStale&&!this._saveReview}get dirty(){return this._isDirty}connectedCallback(){this._previewController.connect(),super.connectedCallback(),this._draftPrincipal&&!Je.isCurrent(this._draftPrincipal)&&this._invalidateDraftIdentity(),this._subscribeDraft(),this._resumeTicket&&this._claimedScope&&this._resumeNavigationDraft(),this._load.loadErrorEntityId!==this._entityId&&(this._load=xi(this._load)),this._groupDeleted&&this._load.loadedEntityId!==this._entityId&&(this._groupDeleted=!1,this._load=xi(this._load)),this._tryLoadCurves(),this._boundKeyHandler=this._onKeyDown.bind(this),this._boundBeforeUnload=this._onBeforeUnload.bind(this),window.addEventListener("keydown",this._boundKeyHandler),window.addEventListener("beforeunload",this._boundBeforeUnload),this._boundFooterOverlaySync=()=>this._scheduleFooterOverlaySync(),window.addEventListener("resize",this._boundFooterOverlaySync),window.addEventListener("scroll",this._boundFooterOverlaySync,{passive:!0,capture:!0}),this._observeFooterScrollRoots(),window.visualViewport?.addEventListener("resize",this._boundFooterOverlaySync),window.visualViewport?.addEventListener("scroll",this._boundFooterOverlaySync),this._coach.connect(this),this.addEventListener("pointerdown",this._onInvitationControl,!0),this.addEventListener("keydown",this._onInvitationControl,!0),document.addEventListener("visibilitychange",this._onInvitationVisibility)}disconnectedCallback(){if(this._managingLights=!1,this._previewController.disconnect(),this._closeRestoration(),this._leaveDraftContext(!0),this._saving&&(this._saveIssue="uncertain"),this._contextGeneration++,this._loadGeneration++,this._recoveryGeneration++,this._savedRead=null,this._saveReview=null,this._load={...this._load,loading:!1},this._commandFocusVersion++,this._pendingCommandFocus=null,this._clearToolbarHost(),this._endLightGesture(!1),this._layoutObserver?.disconnect(),this._layoutObserver=null,this._layoutNodes=[],this._pendingNarrowLayout=null,this._dismissInvitation(),this._invitationObserver?.disconnect(),this._invitationGraph=null,this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,null!==this._invitationHintTimer&&clearTimeout(this._invitationHintTimer),this._invitationHintTimer=null,this._invitationEditHint=null,this._invitationTogether=!1,this._clearCanvasHelpNotice(),this.removeEventListener("pointerdown",this._onInvitationControl,!0),this.removeEventListener("keydown",this._onInvitationControl,!0),document.removeEventListener("visibilitychange",this._onInvitationVisibility),super.disconnectedCallback(),this._stopDrawIn(),this._stopDrawOut(),this._clearMembershipStatus(),this._previewActive&&this._stopPreview(),this._clearPresetGraphTrial(),this._setMembershipOpen(!1),this._coach.disconnect(),this._previewController.disconnect(),this._editGesture=null,this._boundKeyHandler&&window.removeEventListener("keydown",this._boundKeyHandler),this._boundBeforeUnload&&window.removeEventListener("beforeunload",this._boundBeforeUnload),this._boundFooterOverlaySync){window.removeEventListener("resize",this._boundFooterOverlaySync),window.removeEventListener("scroll",this._boundFooterOverlaySync,!0),window.visualViewport?.removeEventListener("resize",this._boundFooterOverlaySync),window.visualViewport?.removeEventListener("scroll",this._boundFooterOverlaySync);for(const t of this._footerScrollRoots)t.removeEventListener("scroll",this._boundFooterOverlaySync,!0);this._footerScrollRoots=[]}null!==this._footerOverlayFrame&&(cancelAnimationFrame(this._footerOverlayFrame),this._footerOverlayFrame=null),this._clearFooterOverlay(),this._saving&&(this._saveGuard.settleError(),this._load={...this._load,loading:!1,loaded:!1,reloadAfterLoadEntityId:void 0},this._dispatchSave({type:"reset"})),this._saveGuard.dispose(),this._stopCurveAnimation(),this._stopRipple()}_commandButtons(){const t=new Map;for(const e of[this.renderRoot,this._activeToolbarHost]){if(!e)continue;const i=[e,e.querySelector("curve-footer")?.renderRoot,e.querySelector("curve-scrubber")?.renderRoot];for(const e of i){if(!e)continue;for(const i of["preview-toggle-btn","btn-save","btn-undo","canvas-help","coach-help","invitation-replay","command-retry"]){const s=e.querySelector(`.${i}`);s&&t.set(i,s)}const i=e.querySelector('[aria-label="Cancel changes"]');i&&t.set("cancel",i)}}return t}willUpdate(t){if(super.willUpdate(t),null===this._hoveredCurveId||this._curves.some(t=>t.entityId===this._hoveredCurveId&&t.visible)||(this._hoveredCurveId=null),t.has("_narrowLayout")||t.has("toolbarHost")){this._commandFocusVersion++;for(const[t,e]of this._commandButtons())if(e.getRootNode().activeElement===e){this._pendingCommandFocus=t;break}}}async _restoreCommandFocus(){const t=this._pendingCommandFocus;if(!t)return;this._pendingCommandFocus=null;const e=this._commandFocusVersion,i=[this.renderRoot,this._activeToolbarHost];await Promise.all(i.flatMap(t=>t?[...t.querySelectorAll("curve-footer, curve-scrubber")].map(t=>t.updateComplete):[])),this.isConnected&&e===this._commandFocusVersion&&this._commandButtons().get(t)?.focus({preventScroll:!0})}updated(t){if(super.updated(t),this._syncInvitation(),this._observeLayout(),!this._lightGesture||this._canEditCurves&&this._lightGesture.roomValue===this._effectiveScrubberPosition&&this._curves.some(t=>t.entityId===this._lightGesture?.entityId&&t.visible)||this._endLightGesture(),t.has("_curves")||t.has("_originalCurves")||t.has("_cancelAnimating")){const t=this._isDirty;t!==this._lastEmittedDirtyState&&(this._lastEmittedDirtyState=t,this.dispatchEvent(new CustomEvent("curve-dirty-state",{detail:{dirty:t,entityId:this._entityId},bubbles:!0,composed:!0})),t&&this._dispatchSave({type:"dirty"}))}this._observeFooterScrollRoots(),this._scheduleFooterOverlaySync(),this._syncToolbarHost(),this._restoreCommandFocus()}_scheduleFooterOverlaySync(){null===this._footerOverlayFrame&&(this._footerOverlayFrame=requestAnimationFrame(()=>{this._footerOverlayFrame=null;const t=this._pendingNarrowLayout;if(this._pendingNarrowLayout=null,null!==t&&t!==this._narrowLayout)return this._endLightGesture(),void(this._narrowLayout=t);this._syncFooterOverlay()}))}_observeFooterScrollRoots(){if(!this._boundFooterOverlaySync||!this.isConnected)return;const t=[];let e=this.getRootNode();for(;e instanceof ShadowRoot;)t.push(e),e=e.host.getRootNode();if(t.length!==this._footerScrollRoots.length||!t.every((t,e)=>t===this._footerScrollRoots[e])){for(const t of this._footerScrollRoots)t.removeEventListener("scroll",this._boundFooterOverlaySync,!0);this._footerScrollRoots=t;for(const e of t)e.addEventListener("scroll",this._boundFooterOverlaySync,{passive:!0,capture:!0})}}_observeLayout(){if("undefined"==typeof ResizeObserver)return;this._layoutObserver??=new ResizeObserver(t=>{for(const e of t)e.target.classList.contains("card")&&e.contentRect.width>0&&(this._pendingNarrowLayout=e.contentRect.width<860);this._scheduleFooterOverlaySync()});const t=[...this.renderRoot.querySelectorAll(".card, .main-stack, .control-dock")];if(t.length!==this._layoutNodes.length||!t.every((t,e)=>t===this._layoutNodes[e])){this._layoutObserver.disconnect(),this._layoutNodes=t;for(const e of t)this._layoutObserver.observe(e)}}_syncFooterOverlay(){const t=this.renderRoot.querySelector(".footer-slot"),e=this.renderRoot.querySelector(".control-dock"),i=this.renderRoot.querySelector(".workspace");if(!e||!i)return;this._clearFooterOverlay();const s=e.querySelector("curve-scrubber"),r=this.renderRoot.querySelector("curve-graph"),n=r?.renderRoot?.querySelector("svg"),o=n?.querySelector(".plot-frame"),a=n?.getScreenCTM?.();if(s&&o&&a&&"undefined"!=typeof DOMPoint&&!this._narrowLayout){const t=new DOMPoint(o.x.baseVal.value,0).matrixTransform(a).x,e=new DOMPoint(o.x.baseVal.value+o.width.baseVal.value,0).matrixTransform(a).x,i=s.getBoundingClientRect();s.style.setProperty("--room-axis-left",`${Math.max(0,t-i.left)}px`),s.style.setProperty("--room-axis-right",`${Math.max(0,i.right-e)}px`)}if(!t?.classList.contains("active"))return;const l=i.getBoundingClientRect(),h=window.visualViewport?.height||document.documentElement.clientHeight||window.innerHeight;let d=0,c=h;const p=this.getRootNode();let u=this.parentElement??(p instanceof ShadowRoot?p.host:null);for(;u;){if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(u).overflowY)){const t=u.getBoundingClientRect();d=Math.max(d,t.top),c=Math.min(c,t.bottom)}const t=u.getRootNode();u=u.parentElement??(t instanceof ShadowRoot?t.host:null)}if(l.bottom<=d||l.top>=c)return;const _=t.getBoundingClientRect();if(Math.max(_.bottom-c,d-_.top)<=1)return;const v=Math.max(0,_.left),g=Math.max(0,Math.min(_.right,window.innerWidth)-v),m=getComputedStyle(e).height;e.style.minHeight=parseFloat(m)>0?m:`${e.getBoundingClientRect().height}px`,t.dataset.overlay="true",t.style.setProperty("--curve-footer-overlay-left",`${v}px`),t.style.setProperty("--curve-footer-overlay-width",`${g}px`);let f=t.getBoundingClientRect(),y=getComputedStyle(t);const b=y.width.endsWith("px")?parseFloat(y.width):0,w=b>0&&f.width>0?f.width/b:1;t.style.setProperty("--curve-footer-overlay-width",g/w+"px"),f=t.getBoundingClientRect(),y=getComputedStyle(t);const x=y.height.endsWith("px")?parseFloat(y.height):0,I=x>0&&f.height>0?f.height/x:1,$=parseFloat(y.bottom)||0,k=Math.min(c,h-$,l.bottom);k-f.height<Math.max(d,l.top)?this._clearFooterOverlay():(t.style.setProperty("--curve-footer-overlay-left",`${v+(v-f.left)/w}px`),t.style.setProperty("--curve-footer-overlay-bottom",`${$+(f.bottom-k)/I}px`))}_clearFooterOverlay(){const t=this.renderRoot.querySelector(".footer-slot");t&&(delete t.dataset.overlay,t.style.removeProperty("--curve-footer-overlay-left"),t.style.removeProperty("--curve-footer-overlay-width"),t.style.removeProperty("--curve-footer-overlay-bottom"));const e=this.renderRoot.querySelector(".control-dock");e&&(e.style.minHeight="")}_setPresetGraphTrial(t){this._presetGraphTrial?.id!==t?.id&&(this._presetGraphTrial=t,this.dispatchEvent(new CustomEvent("preset-trial-change",{detail:{presetId:t?.id??null},bubbles:!0,composed:!0})))}_clearPresetGraphTrial(){this._pendingPresetGraphTrial=null,this._hoveredPresetGraphTrial=null,this._focusedPresetGraphTrial=null,this._setPresetGraphTrial(null),this._lastPresetPointerType=null}_dismissCoach(t){const e=t instanceof KeyboardEvent&&"Escape"===t.key?t.composedPath():null;this._coach.dismiss(),this.updateComplete.then(()=>{if(e){const t=this._activeFocusPath().at(-1);if(t&&t!==document.body&&t.isConnected&&!e.includes(t))return}this._focusHelpButton()})}_toggleCoach(){!this._isAdmin||this._saving||this._cancelAnimating||this._membershipLocked||("inactive"===this._coach.phase?this._coach.toggle(this._isDirty):this._dismissCoach())}_rememberPresetPointer(t){this._lastPresetPointerType=t.pointerType}_startPresetGraphTrial(t,e){if(this._invitation.curve)return;"touch"!==(e&&"pointerType"in e?String(e.pointerType):this._lastPresetPointerType)&&(this._canShowPresetGraphTrial||this._drawIn)&&(this._coach.stopShimmer(),"pointerenter"===e?.type&&(this._hoveredPresetGraphTrial=t),"focus"===e?.type&&(this._focusedPresetGraphTrial=t),this._drawIn?this._pendingPresetGraphTrial=t:this._canShowPresetGraphTrial&&this._setPresetGraphTrial(t))}_endPresetGraphTrial(t,e){"blur"===e.type?this._focusedPresetGraphTrial?.id===t.id&&(this._focusedPresetGraphTrial=null):this._hoveredPresetGraphTrial?.id===t.id&&(this._hoveredPresetGraphTrial=null),this._lastPresetPointerType=null;const i=this._hoveredPresetGraphTrial??this._focusedPresetGraphTrial;i?this._startPresetGraphTrial(i):this._clearPresetGraphTrial()}_applyPreset(t){if(this._dismissInvitation(),this._cancelAnimating||this._saving||this._membershipLocked)return;this.renderRoot.querySelector("curve-graph")?.cancelInteraction(),this._completeDragMaybeReload();const e=this._selectedCurve;if(!e)return void this._clearPresetGraphTrial();const i=e.entityId,s=function(t,e,i){const s=()=>i.map(t=>({...t}));return null!==e?t.map(t=>t.entityId===e?{...t,controlPoints:s()}:t):t.map(t=>({...t,controlPoints:s()}))}(this._curves,i,t.controlPoints);if(this._clearPresetGraphTrial(),Re(s,this._curves))return;const r=Yt(this._joy,"ripple")?this._shownShape(e):null;this._commitCurveEdit(s),this._startRipple(i,r),this._coach.afterEdit()}get _liveRipple(){const t=this._ripple,e=t&&this._curves.find(e=>e.entityId===t.entityId);return t&&e?.controlPoints===t.committed?t:null}_shownShape(t){const e=this._liveRipple;return e?.entityId===t.entityId?e.shown:ee(t.controlPoints)}_startRipple(t,e){if(this._stopRipple(),!e)return;const i=this._curves.find(e=>e.entityId===t)?.controlPoints;if(!i)return;const s=le(e,ee(i));this._ripple={entityId:t,committed:i,shown:ce(s,0)},this._cancelRippleLoop=Jt(de(s),e=>{this._liveRipple&&!Wt()?this._ripple={entityId:t,committed:i,shown:ce(s,e)}:this._stopRipple()},()=>this._stopRipple())}_stopRipple(){this._cancelRippleLoop?.(),this._cancelRippleLoop=null,this._ripple=null}get _curveFrame(){const t=this._morphLine;if(t)return{entityId:t.entityId,pieces:ue(t.from,t.to,t.t),knots:null};const e=this._liveRipple;return e?{entityId:e.entityId,pieces:e.shown.pieces,knots:pe(e.committed,e.shown)}:null}_matchingPresetId(t){return ft.find(e=>Fe(t,e))?.id??null}_presetChipLabel(t){return mt.presets.chipLabels[t.id]??t.name}_renderPresetSparkline(t){return q`
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
    `}_renderShapeChips(){const t=this._selectedCurve;if(!t||!this._isAdmin||this._membershipLocked)return K;const e=this._matchingPresetId(t),i=this._isShowingPresetGraphTrial?this._presetGraphTrial?.id:null;return q`
      <div class="shape-chip-bar" role="group" aria-label=${mt.presets.panelAria}>
        ${ft.map(s=>{const r=i===s.id,n=this._invitation.presetHighlighted&&"dim_accent"===s.id,o=!this._invitation.curve&&(r||!i&&e===s.id);return q`
            <button
              class="preset-option shape-chip ${r?"trial":""} ${o?"active":""} ${n?"invitation-chip":""}"
              data-preset=${s.id}
              aria-current=${o?"true":K}
              aria-label=${`${s.name}. ${n?mt.invitation.forLight(t.friendlyName):mt.presets.chooseForLight(t.friendlyName)}`}
              @pointerdown=${t=>this._rememberPresetPointer(t)}
              @pointerenter=${t=>this._startPresetGraphTrial(s,t)}
              @pointerleave=${t=>this._endPresetGraphTrial(s,t)}
              @pointercancel=${t=>this._endPresetGraphTrial(s,t)}
              @focus=${t=>this._startPresetGraphTrial(s,t)}
              @blur=${t=>this._endPresetGraphTrial(s,t)}
              @click=${()=>this._applyPreset(s)}
            >
              ${this._renderPresetSparkline(s)}
              <span class="shape-chip-name">${this._presetChipLabel(s)}</span>
            </button>
          `})}
      </div>
    `}_storedStateKey(t){return`lightener:curve-card:v1:${t}`}_readStoredState(t){try{const e=sessionStorage.getItem(this._storedStateKey(t));if(!e)return null;const i=JSON.parse(e),s="string"==typeof i.selectedCurveId||null===i.selectedCurveId?i.selectedCurveId:null;let r=null;return"number"==typeof i.scrubberPosition&&isFinite(i.scrubberPosition)&&(r=Math.round(Math.min(100,Math.max(0,i.scrubberPosition)))),{selectedCurveId:s,scrubberPosition:r}}catch{return null}}_writeStoredState(t,e){t===this._entityId&&(this._sessionStateInitialized=!0);try{const i={...this._readStoredState(t)??{selectedCurveId:null,scrubberPosition:null},...e};sessionStorage.setItem(this._storedStateKey(t),JSON.stringify(i))}catch{}}_onKeyDown(t){if(this._restorationOpen)return;const e=t.composedPath(),i=e.find(t=>t instanceof HTMLElement&&ns.has(t)),s=i?ns.get(i):e.find(t=>t instanceof hs);if("Escape"===t.key){if(t.defaultPrevented||s!==this)return;return void(this._invitation.curve?(t.preventDefault(),this.canvasHelp?this._closeCanvasHelp():this._dismissInvitation()):this._presetGraphTrial?(t.preventDefault(),this._clearPresetGraphTrial()):"inactive"!==this._coach.phase&&(t.preventDefault(),e.some(t=>t instanceof Element&&t.classList.contains("coach-prompt"))?this._dismissCoach(t):this._coach.dismiss()))}if(t.defaultPrevented||s!==this||t.isComposing||t.altKey||t.shiftKey||!t.ctrlKey&&!t.metaKey)return;if(e.some(t=>t instanceof HTMLElement&&(t.isContentEditable||t.hasAttribute("contenteditable")&&"false"!==t.getAttribute("contenteditable")||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t instanceof HTMLInputElement&&"range"!==t.type)))return;const r=t.key.toLowerCase();"s"===r&&(t.preventDefault(),this._canEditCurves&&this._isDirty&&this._onSave()),"z"===r&&this._canUndoCurves&&this._undoStack.length>0&&(t.preventDefault(),this._undo())}_onBeforeUnload(t){this._isDirty&&(t.preventDefault(),t.returnValue="")}async _tryLoadCurves(){if(this._draftAuthStale)return;const t=this._contextGeneration;if(!function(t,e){return!(t.loaded&&t.loadedEntityId===e||t.loading)}(this._load,this._entityId))return;if(!this._hass||!this._entityId){if(0===this._curves.length){const t=[{entityId:"light.ceiling_light",friendlyName:"Ceiling Light",controlPoints:[{lightener:0,target:0},{lightener:20,target:0},{lightener:60,target:80},{lightener:100,target:100}],visible:!0,color:Mt[0]},{entityId:"light.sofa_lamp",friendlyName:"Sofa Lamp",controlPoints:[{lightener:0,target:0},{lightener:10,target:50},{lightener:40,target:100},{lightener:70,target:100},{lightener:100,target:60}],visible:!0,color:Mt[1]},{entityId:"light.led_strip",friendlyName:"LED Strip",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}],visible:!0,color:Mt[2]}];this._curves=t,this._originalCurves=Ae(t),this._cleanVersion=this._dirtyVersion}return}const e=++this._loadGeneration;this._load=function(t){return{...t,loadError:null,loading:!0}}(this._load);const i=this._entityId;try{const s=await this._hass.callWS({type:"lightener/get_curves",entity_id:i});if(t!==this._contextGeneration||e!==this._loadGeneration)return;if(!Me(s.entities))throw new Error(mt.guardedSave.invalidResponse);const r=De(s);if(this._membershipBaseline)return this._load={...this._load,loaded:!0,loadedEntityId:i},r?Ge(r.entities,this._membershipBaseline)?(this._baseline=r,this._rawBaseline=r.entities,this._membershipBaseline=null,this._saveIssue=null,void(this._load={...this._load,loaded:!0,loadedEntityId:i})):void(this._saveIssue="conflict"):void(this._saveIssue="incompatible");const{state:n,action:o}=function(t,e,i,s){return i!==e?{state:t,action:"discard"}:t.reloadAfterLoadEntityId===e?{state:t,action:"run-queued-reload"}:s?{state:{...t,pendingReloadEntityId:e,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"defer-dirty"}:{state:{...t,pendingReloadEntityId:void 0,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"apply"}}(this._load,i,this._entityId,this._isDirty);let a;if("apply"!==o&&"defer-dirty"!==o||(a=Pe(s.entities,this._hass.states,Mt)),this._load=n,("apply"===o||"defer-dirty"===o)&&"apply"===o&&a){if(this._endLightGesture(!1),this._curves=a,this._originalCurves=Ae(a),this._baseline=r,this._verifyAfterDiscard&&r&&(this._draftLost=!1,this._resumeUnverified=!1,this._verifyAfterDiscard=!1,this._draftNotice=null),r&&(this._knownEntryId=r.config_entry_id),this._subscribeDraft(),this._rawBaseline=structuredClone(s.entities),this._saveIssue=this._isAdmin?r?null:"incompatible":"readonly",this._cleanVersion=this._dirtyVersion,!this._sessionStateInitialized&&this._curves.length>0&&null===this._selectedCurveId&&null===this._scrubberPosition){this._sessionStateInitialized=!0;const t=this._readStoredState(i);this._invitationAutoAllowed=this.experimentalFirstUse&&!0===this._config.firstRun&&!t&&!function(t){if(me.has(t))return!0;try{return null!==localStorage.getItem(fe(t))}catch{return!1}}(i)&&be(this._curves),t?(null!==t.selectedCurveId&&Xe(this._curves,t.selectedCurveId)&&(this._selectedCurveId=t.selectedCurveId),null!==t.scrubberPosition&&(this._scrubberPosition=t.scrubberPosition)):this._invitationAutoAllowed?this._selectedCurveId=this._invitationTarget?.entityId??null:!0===this._config.firstRun&&"choose_shape"===this._coach.phase&&(this._selectedCurveId=this._curves[0].entityId,this._writeStoredState(i,{selectedCurveId:this._selectedCurveId}))}this.updateComplete.then(()=>this._coach.maybeStartShimmer())}}catch(s){if(t!==this._contextGeneration||e!==this._loadGeneration)return;const{state:r,discarded:n}=function(t,e,i,s){return i!==e?{state:t,discarded:!0}:{state:{...t,loadError:s,loaded:!0,loadedEntityId:e,loadErrorEntityId:e},discarded:!1}}(this._load,i,this._entityId,String(s));this._load=r,n||console.error("[Lightener] Failed to load curves:",s)}finally{if(t!==this._contextGeneration||e!==this._loadGeneration)return;const{state:s,followUp:r}=function(t,e,i){const s={...t,loading:!1};return i!==e?{state:s,followUp:"reload-changed-entity"}:t.reloadAfterLoadEntityId===e?{state:{...s,reloadAfterLoadEntityId:void 0,loaded:!1},followUp:"run-queued-reload"}:{state:s,followUp:"none"}}(this._load,i,this._entityId);this._load=s,"none"!==r&&this._tryLoadCurves()}}_onScrubberMove(t){if(!this._canEditCurves||!Number.isFinite(t.detail.position))return;this._endLightGesture(),this._dismissInvitation(),this._invitationTogether=!1,this._clearPresetGraphTrial();const e=Math.min(100,Math.max(0,t.detail.position));this._scrubberPosition=e,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{scrubberPosition:e}),this._previewActive&&this._previewLights(e)}_onScrubberStart(){this._endLightGesture()}_onScrubberEnd(){}_openRestoration(){this._restorationFocus=this.renderRoot.activeElement,this._restorationOpen=!0}_closeRestoration(){this._restorationOpen=!1;const t=this._restorationFocus;this._restorationFocus=null,t?.isConnected&&this.updateComplete.then(()=>t.focus())}_reviewRestoration(t,e){(e?this._previewController.restoreSelected(t.detail.token,t.detail.selected??[]):this._previewController.keepCurrent(t.detail.token))?this._closeRestoration():this.requestUpdate()}async _settlePreviewForMembership(){const t=this._contextGeneration;return await this._previewController.stop(),!(t!==this._contextGeneration||!this.isConnected)&&(this._previewController.mutationBlocked?(this._manageError=mt.restoration.operationBlocked,!1):!this._previewController.blocked||(this._openRestoration(),!1))}_refreshActivePreview(t=!1){this._previewController.refresh(t)}_previewLights(t,e=!1){this._previewController.previewLights(t,e)}_previewSingleLight(t,e,i=!1,s){this._previewController.previewSingleLight(t,e,i,s)}_onSelectCurve(t){if(this._endLightGesture(),this._dismissInvitation(),this._hoveredCurveId!==t.detail.entityId&&(this._hoveredCurveId=null),this._cancelAnimating)return;const{entityId:e}=t.detail;(e===this._selectedCurveId||Xe(this._curves,e))&&(this._clearPresetGraphTrial(),this._selectedCurveId=function(t,e){return t===e?null:e}(this._selectedCurveId,e),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onHoverCurve(t){const{entityId:e}=t.detail;this._hoveredCurveId=null!==e&&this._curves.some(t=>t.entityId===e&&t.visible)?e:null}_clearSelection(){const t=this._selectedCurveId;if(null===t)return;const e=this._activeFocusPath().some(t=>t.matches(".context-clear"));this._onSelectCurve(new CustomEvent("select-curve",{detail:{entityId:t}})),e&&this.updateComplete.then(()=>{null===this._selectedCurveId&&this.isConnected&&this.renderRoot.querySelector(".context-line")?.focus({preventScroll:!0})})}_onFocusCurve(t){if(this._endLightGesture(),this._hoveredCurveId!==t.detail.entityId&&(this._hoveredCurveId=null),this._invitation.curve&&t.detail.entityId===this._selectedCurveId)return void this._invitation.freeze();if(this._dismissInvitation(),this._cancelAnimating)return;const{entityId:e}=t.detail;Xe(this._curves,e)&&(this._clearPresetGraphTrial(),this._selectedCurveId=e,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onLightLevelStart(t){this._endLightGesture(),this.renderRoot.querySelector("curve-graph")?.cancelInteraction(),this._completeDragMaybeReload(),this._dismissInvitation();const{entityId:e}=t.detail,i=Math.round(this._effectiveScrubberPosition);if(!this._canEditCurves||this._load.loading||!this._entityId||this._load.loadedEntityId!==this._entityId||i<=0||!Xe(this._curves,e))return;this._onFocusCurve(t),this._stopRipple();const s=this._curves.find(t=>t.entityId===e).controlPoints;this._editGesture={kind:"light",undoPushed:!1,entityId:e,groupId:this._entityId,position:i,roomValue:this._effectiveScrubberPosition,startingPoints:s.map(t=>({...t})),startingTarget:Rt(s,i),dirtyVersion:this._dirtyVersion,undoStack:this._undoStack.slice()}}_onLightLevelInput(t){const e=this._lightGesture;if(!e||t.detail.entityId!==e.entityId)return;if(!this._canEditCurves||this._load.loading||e.groupId!==this._entityId||e.roomValue!==this._effectiveScrubberPosition||!Xe(this._curves,e.entityId))return void this._endLightGesture();const i=t.detail.target;if(!Number.isFinite(i))return;const s=i===e.startingTarget,r=this._curves.find(t=>t.entityId===e.entityId),n=s?Fe(r,{controlPoints:e.startingPoints})?null:this._curves.map(t=>t.entityId===e.entityId?{...t,controlPoints:e.startingPoints.map(t=>({...t}))}:t):function(t,e,i,s){if(!Number.isFinite(i)||!Number.isFinite(s))return null;const r=t.findIndex(t=>t.entityId===e&&t.visible);if(r<0)return null;const n=t[r],o=Math.round(Tt(i,0,100)),a=Math.round(Tt(s,0,100)),l=n.controlPoints.find(t=>t.lightener===o);if(l?.target===a)return null;if(!l&&Rt(n.controlPoints,o)===a)return null;const h=n.controlPoints.map(t=>({...t}));return l?h.find(t=>t.lightener===o).target=a:h.push({lightener:o,target:a}),h.sort((t,e)=>t.lightener-e.lightener),t.map((t,e)=>e===r?{...n,controlPoints:h}:t)}(this._curves,e.entityId,e.position,i);n&&(this._commitGestureEdit(n),this._coach.afterEdit(),this._previewSingleLight(e.entityId,e.position,!1,s?e.startingTarget:Math.round(Math.min(100,Math.max(0,i)))))}_onLightLevelEnd(t){t.detail.entityId===this._lightGesture?.entityId&&this._endLightGesture()}_endLightGesture(t=!0){this._lightGesture&&(t?this._completeDragMaybeReload():(this._restoreNetZeroLightGesture(),this._editGesture=null))}_restoreNetZeroLightGesture(){const t=this._lightGesture;if(!t?.undoPushed)return;const e=this._curves.find(e=>e.entityId===t.entityId)?.controlPoints;e&&Fe({controlPoints:e},{controlPoints:t.startingPoints})&&(this._dirtyVersion=t.dirtyVersion,this._undoStack=t.undoStack,this._isDirty||this._coach.afterClean(),this._curves=[...this._curves])}_commitGestureEdit(t){this._suppressDraftCapture=!1;const e=this._editGesture??={kind:"point",undoPushed:!1},i=!e.undoPushed;i&&(this._pushUndo(),e.undoPushed=!0),this._curves=t,this._dirtyVersion++,i&&this._checkpointDraft()}_pushUndo(){Ze(this._undoStack,this._curves)}_commitCurveEdit(t){this._suppressDraftCapture=!1,this._pushUndo(),this._curves=t,this._dirtyVersion++,this._checkpointDraft(),this._refreshActivePreview(!0)}_completeDragMaybeReload(){this._restoreNetZeroLightGesture(),this._editGesture=null,this._checkpointDraft(),this.isConnected&&!this._load.loaded&&this._hass&&this._tryLoadCurves()}_undo(){this._endLightGesture(),this._dismissInvitation(),this._canUndoCurves&&0!==this._undoStack.length&&(this._dirtyVersion++,this._clearPresetGraphTrial(),this._animateCurvesTo(this._undoStack.pop(),()=>{this._refreshActivePreview(!0)}))}_stopCurveAnimation(){this._curveAnimationGeneration++,null!==this._cancelAnimFrame&&cancelAnimationFrame(this._cancelAnimFrame),this._cancelAnimFrame=null,this._cancelAnimating=!1,this._morphLine=null}_activeFocusPath(){const t=[];let e=document.activeElement;for(;e;)t.push(e),e=e.shadowRoot?.activeElement??null;return t}_retainAnimationFocus(){const t=this._activeFocusPath(),e=t.at(-1),i=t.some(t=>this._activeToolbarHost?.contains(t));if(!e||!t.includes(this)&&!i)return;const s=[...this._commandButtons()].find(([,t])=>t===e)?.[0],r=this.renderRoot.querySelector("curve-legend")?.renderRoot;if(!(r?.contains(e)&&e.matches(".manage-trigger, .add-light-btn, .delete-group-btn"))&&!e.classList.contains("hit-circle")&&!(e instanceof HTMLInputElement&&"range"===e.type)&&(!s||"btn-undo"===s&&this._undoStack.length>0||"preview-toggle-btn"===s&&this._previewActive))return;const n=t.reduceRight((t,e)=>t??e.closest(".editor-help, .editor-commands"),null)??this.renderRoot.querySelector(".card");n?.focus({preventScroll:!0})}_animateCurvesTo(t,e){const i=Ae(this._curves),s=this._curveFrame,r=s&&t.find(t=>t.entityId===s.entityId),n=s&&r?{entityId:s.entityId,from:s.pieces,to:ee(r.controlPoints).pieces}:null;this._stopCurveAnimation();const o=this._curveAnimationGeneration;this._retainAnimationFocus(),this._stopRipple(),this._morphLine=n?{...n,t:0}:null,this._cancelAnimating=!0;const a=performance.now(),l=s=>{if(o!==this._curveAnimationGeneration)return;const r=Math.max(0,s-a),h=Math.min(r/300,1),d=Ut(h);this._morphLine=n&&h<1?{...n,t:Math.max(d,0)}:null;const c=t.map((t,e)=>{const s=i[e];if(!s)return t;const r=s.controlPoints,n=t.controlPoints,o=function(t,e,i){const s=Math.min(t.length,e.length),r=[];for(let n=0;n<s;n++)r.push({lightener:Math.round(t[n].lightener+(e[n].lightener-t[n].lightener)*i),target:Math.round(t[n].target+(e[n].target-t[n].target)*i)});return r}(r,n,d);if(n.length>o.length&&h>=1)for(let t=o.length;t<n.length;t++)o.push({...n[t]});if(r.length>o.length&&h<1)for(let t=o.length;t<r.length;t++)o.push({...r[t]});return o.sort((t,e)=>t.lightener-e.lightener),{...t,controlPoints:o,visible:s.visible}});if(this._curves=c,h<1)this._cancelAnimFrame=requestAnimationFrame(l);else{this._curves=function(t,e){return e.map((e,i)=>({...e,visible:t[i]?.visible??e.visible}))}(i,t),this._cancelAnimating=!1,this._cancelAnimFrame=null;const s=Re(this._curves,this._originalCurves);s&&(this._cleanVersion=this._dirtyVersion,this._coach.afterClean()),e?.(),this._checkpointDraft(),s&&this._reloadPendingDirtyResponse()}};this._cancelAnimFrame=requestAnimationFrame(l)}_onPointMove(t){if(!this._canEditCurves)return;this._endLightGesture(),this._clearPresetGraphTrial();const{curveIndex:e,pointIndex:i,lightener:s,target:r}=t.detail,n=this._graphCurves,o=n[e]?.controlPoints[i];if(o?.lightener===s&&o.target===r)return;const a=function(t,e,i,s,r){const n=[...t],o=n[e];if(!o||!o.controlPoints[i])return null;const a={...o},l=[...a.controlPoints];return l[i]={lightener:s,target:r},a.controlPoints=l,n[e]=a,n}(n,e,i,s,r);if(null===a)return;const l=this._curves[e];l&&this._selectedCurveId!==l.entityId&&(this._selectedCurveId=l.entityId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId})),this._commitGestureEdit(a),this._finishInvitation(),this._coach.afterEdit(),l?this._previewSingleLight(l.entityId,s,!1,r):this._refreshActivePreview()}_onPointDrop(t){this._lightGesture||this._completeDragMaybeReload()}_onPointAdd(t){if(!this._canEditCurves)return;this._endLightGesture(),this._clearPresetGraphTrial();const{lightener:e,target:i,entityId:s}=t.detail,r=s??this._selectedCurveId;if(!r)return;const n=function(t,e,i,s){return function(t,e,i,s){const r=t.findIndex(t=>t.entityId===e);if(r<0)return null;if(t[r].controlPoints.some(t=>t.lightener===i))return null;const n=[...t],o={...n[r]};return o.controlPoints=[...o.controlPoints,{lightener:i,target:s}].sort((t,e)=>t.lightener-e.lightener),n[r]=o,n}(t,e,i,s)}(this._graphCurves,r,e,i);null!==n&&(this._commitCurveEdit(n),this._finishInvitation(),this._coach.afterEdit())}_onPointRemove(t){if(!this._canEditCurves)return;this._endLightGesture(),this._clearPresetGraphTrial(),this._completeDragMaybeReload();const{curveIndex:e,pointIndex:i}=t.detail,s=Qe(this._graphCurves,e,i);null!==s&&(this._commitCurveEdit(s),this._finishInvitation(),this._coach.afterEdit())}_onToggleCurve(t){if(this._endLightGesture(),this._dismissInvitation(),this._cancelAnimating)return;this._clearPresetGraphTrial();const{entityId:e}=t.detail,i=this._selectedCurveId,s=function(t,e,i){const s=function(t,e){return t.map(t=>t.entityId===e?{...t,visible:!t.visible}:t)}(t,i);let r=e;if(e===i){const t=s.find(t=>t.entityId===i);t&&!t.visible&&(r=null)}return{curves:s,selectedCurveId:r}}(this._curves,this._selectedCurveId,e);this._curves=s.curves,s.selectedCurveId!==i&&(this._selectedCurveId=s.selectedCurveId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}async _onDeleteGroup(){if(!this._hass||!this._entityId||this._managingLights||this._runtimeBlocked)return;if(this._clearPresetGraphTrial(),(this._previewActive||this._previewController.blocked)&&!await this._settlePreviewForMembership())return;if(!this._isAdmin||this._runtimeBlocked||this._managingLights)return;const t=this._contextGeneration,e=this._entityId;this._manageError=null,this._managingLights=!0;try{const i=await this._hass.callWS({type:"config/entity_registry/get",entity_id:e});if(i?.platform!==xe)throw new rs(mt.legend.deleteWrongGroup);const s=i?.config_entry_id;if(!s)throw new rs(mt.legend.deleteMissingEntry);if(t!==this._contextGeneration||!this.isConnected||!this._isAdmin||this._runtimeBlocked||this._previewController.blocked)return;const r=this._previewController.beginMutation([]);if(!r)return void(this._manageError=mt.restoration.membershipBlocked);if(await this._hass.callApi("DELETE",`config/config_entries/entry/${s}`),r(),t!==this._contextGeneration||!this.isConnected||this._authInvalidated||!this._isAdmin||this._runtimeBlocked)return;this.discardNavigationDraft(),this._curves=[],this._originalCurves=[],this._undoStack=[],this._load={...this._load,loaded:!0,loadedEntityId:e,loadError:null,loadErrorEntityId:void 0},this._selectedCurveId=null,this._writeStoredState(e,{selectedCurveId:null}),this._groupDeleted=!0,this.dispatchEvent(new CustomEvent("lightener-group-deleted",{detail:{entityId:e,configEntryId:s},bubbles:!0,composed:!0}))}catch(e){console.error("[Lightener] Failed to delete group:",e),t===this._contextGeneration&&this.isConnected&&!this._authInvalidated&&(this._manageError=e instanceof rs?e.message:mt.legend.deleteError)}finally{t===this._contextGeneration&&(this._managingLights=!1)}}async _openMembershipEditor(){this._dismissInvitation(),this._canManageLights&&(this._hoveredCurveId=null,this._coach.interrupt(),this._clearPresetGraphTrial(),(!this._previewActive&&!this._previewController.blocked||await this._settlePreviewForMembership())&&this._canManageLights&&(this._manageError=null,this._clearMembershipStatus(),this._setMembershipOpen(!0)))}_closeMembershipEditor(){return this._setMembershipOpen(!1),(async()=>{if(await this.updateComplete,this._membershipOpen)return;const t=this.renderRoot.querySelector("curve-legend");await(t?.updateComplete),!this._membershipOpen&&this.isConnected&&t?.renderRoot?.querySelector(".manage-trigger")?.focus()})().catch(t=>this._reportMembershipFocusRestoreError(t))}_reportMembershipFocusRestoreError(t){console.warn("[Lightener] Could not restore focus after closing Edit lights:",t)}_onMembershipApplied(t){if(!this._hass)return;const e=t.detail;this._baseline=null,this._membershipBaseline=structuredClone(e.entities),this._rawBaseline=structuredClone(e.entities),this._saveIssue=null;const i=new Map(this._curves.map(t=>[t.entityId,t.visible])),s=this._curves,r=this._selectedCurveId;this._stopDrawIn(),this._stopDrawOut(),this._curves=Pe(e.entities,this._hass.states,Mt).map(t=>({...t,visible:i.get(t.entityId)??!0}));const n=new Set(this._curves.map(t=>t.entityId)),o=s.flatMap((t,e)=>t.visible&&!n.has(t.entityId)?[{curve:t,index:e}]:[]);this._originalCurves=Ae(this._curves);const a=new Set(this._curves.filter(t=>!i.has(t.entityId)).map(t=>t.entityId));this._cleanVersion=this._dirtyVersion,this._undoStack=[];const l=(e.added_entity_ids??[]).find(t=>this._curves.some(e=>e.entityId===t));l?this._selectedCurveId=l:null===this._selectedCurveId||this._curves.some(t=>t.entityId===this._selectedCurveId)||(this._selectedCurveId=null),this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:this._selectedCurveId}),this._bindMembershipBaseline(),this._showMembershipStatus();const h=this._closeMembershipEditor();if(a.size>0&&this.isConnected&&Yt(this._joy,"draw_in")){this._startDrawIn(a);const t=this._drawIn.token;h.then(()=>{this._drawIn?.token===t&&!this._membershipOpen&&this.isConnected&&(this._drawIn={...this._drawIn,ready:!0})})}o.length>0&&this.isConnected&&Yt(this._joy,"draw_in")&&(this._drawOut={token:++this._drawOutToken,curves:o,selectedCurveId:r},this._drawOutTimer=setTimeout(()=>this._stopDrawOut(),560))}async _bindMembershipBaseline(){if(!this._hass||!this._entityId||!this._membershipBaseline)return;const t=this._entityId,e=this._contextGeneration,i=++this._loadGeneration,s=this._membershipBaseline;this._load={...this._load,loading:!1,loaded:!0,loadedEntityId:t};const r=()=>e===this._contextGeneration&&i===this._loadGeneration;try{const e=await this._hass.callWS({type:"lightener/get_curves",entity_id:t});if(!r())return;const i=De(e);if(!i)return void(this._saveIssue="incompatible");if(!Ge(i.entities,s))return void(this._saveIssue="conflict");this._baseline=i,this._rawBaseline=i.entities,this._membershipBaseline=null,this._saveIssue=null,this._checkpointDraft()}catch(t){if(!r())return;this._saveIssue="not_found"===t?.code?"not_found":"reread","not_found"===this._saveIssue&&(this._groupDeleted=!0),this._saveState={phase:"error",message:mt.guardedSave.readFailed}}}_stopDrawOut(){null!==this._drawOutTimer&&clearTimeout(this._drawOutTimer),this._drawOutTimer=null,this._drawOut=null}_startDrawIn(t){this._stopDrawIn(),this._drawIn={ids:t,token:++this._drawInToken,ready:!1},this._drawInWaitingForVisible=!0,this._unsubscribeDrawInMotion=Kt(this._boundStopDrawIn),this.addEventListener("pointerdown",this._boundStopDrawIn,!0),this.addEventListener("keydown",this._boundStopDrawIn,!0),this.addEventListener("click",this._boundStopDrawIn,!0)}_stopDrawIn(){null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=null,this._unsubscribeDrawInMotion?.(),this._unsubscribeDrawInMotion=null,this.removeEventListener("pointerdown",this._boundStopDrawIn,!0),this.removeEventListener("keydown",this._boundStopDrawIn,!0),this.removeEventListener("click",this._boundStopDrawIn,!0),this._drawInWaitingForVisible=!1,this._drawIn=null;const t=this._pendingPresetGraphTrial;this._pendingPresetGraphTrial=null,t&&this.isConnected&&this._canShowPresetGraphTrial&&this._startPresetGraphTrial(t)}_showMembershipStatus(){this._clearMembershipStatus(),"error"!==this._saveState.phase&&this._dispatchSave({type:"reset"}),this._membershipStatus=mt.membership.updated,this._membershipStatusTimer=window.setTimeout(()=>{this._membershipStatusTimer=null,this._membershipStatus=null},2e3)}_clearMembershipStatus(){null!==this._membershipStatusTimer&&(window.clearTimeout(this._membershipStatusTimer),this._membershipStatusTimer=null),this._membershipStatus=null}_setMembershipOpen(t){t&&this._endLightGesture(),this._membershipOpen!==t&&(this._membershipOpen=t,this.dispatchEvent(new CustomEvent("lightener-membership-state",{detail:{open:t},bubbles:!0,composed:!0})))}async saveCurves(){return this._onSave()}_guardedSaveFailure(t){const e=t?.code??"",i={conflict:["refused","conflict",mt.guardedSave.conflict],precondition_required:["refused","refresh",mt.guardedSave.refresh],not_found:["refused","not_found",mt.guardedSave.notFound],unknown_entities:["refused","conflict",mt.guardedSave.unknownEntities],invalid_format:["refused",null,mt.guardedSave.invalid],unauthorized:["refused",null,mt.guardedSave.unauthorized],reload_failed:["refused","reread",mt.guardedSave.rolledBack],rollback_reload_failed:["runtime","runtime",mt.guardedSave.runtime]},[s,r,n]=i[e]??["unknown","uncertain",mt.guardedSave.uncertain];return{disposition:s,issue:r,message:n,deleted:"not_found"===e}}async _onSave(){if(this._endLightGesture(),this._dismissInvitation(),!(this._hass&&this._entityId&&this._canGuardedSave&&this._baseline))return!1;this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview();const t=this._entityId,e=this._contextGeneration,i=this._baseline,s=this._dirtyVersion,r=Ae(this._curves),n=Ee(Ne(this._originalCurves,r)),o=Ue(i.entities,n);if(this._checkpointDraft(),this._draftLost)return!1;const a=this._draftClaim?{...this._draftClaim}:null,l=this._claimedScope?{...this._claimedScope}:null,h=this._identityAvailable?this._draftPrincipal:null,d=crypto.randomUUID();h&&(Je.beginWrite(h,i.config_entry_id,d),this._pendingDraftWrite={principal:h,entry:i.config_entry_id,id:d}),this._submittedIntent=o,this._dispatchSave({type:"save-start"});const{generation:c,settled:p}=this._saveGuard.arm(),u=()=>e===this._contextGeneration&&t===this._entityId&&this.isConnected;try{const e=await Promise.race([this._hass.callWS({type:"lightener/save_curves",entity_id:t,expected_revision:i.revision,curves:n}).then(t=>{const e=De(t,!0);return h&&e&&e.config_entry_id===i.config_entry_id&&Ge(e.entities,o)?Je.settleWrite(h,i.config_entry_id,d,"confirmed"):h&&Je.settleWrite(h,i.config_entry_id,d,"unknown"),{value:t}}).catch(t=>{const e=this._guardedSaveFailure(t);throw h&&Je.settleWrite(h,i.config_entry_id,d,e.disposition),"runtime"!==e.disposition||h&&!Je.isCurrent(h)||(h||this._identityUnavailableRuntimeEntries.add(i.config_entry_id),this._baseline?.config_entry_id===i.config_entry_id&&this._previewActive&&this._stopPreview(),this.requestUpdate()),t}),p.then(()=>({timeout:!0}))]);if(!u())return!1;if("timeout"in e)return this._saveIssue="uncertain",h&&Je.settleWrite(h,i.config_entry_id,d,"unknown"),this._checkpointDraft(),!1;const _=De(e.value,!0);if(!_||_.config_entry_id!==i.config_entry_id||!Ge(_.entities,o))throw{code:"uncertain"};if(this._dirtyVersion!==s||!Re(this._curves,r))throw{code:"uncertain"};this._loadGeneration++,this._load={...this._load,loading:!1,loaded:!0,loadedEntityId:t,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0};const v=new Map(this._curves.map(t=>[t.entityId,t.visible])),g=Pe(_.entities,this._hass.states,Mt).map(t=>({...t,visible:v.get(t.entityId)??!0}));return this._baseline=_,this._rawBaseline=_.entities,this._curves=g,this._originalCurves=Ae(g),this._cleanVersion=this._dirtyVersion,this._undoStack=[],this._submittedIntent=null,this._saveIssue=null,this._dispatchSave({type:"save-success"}),this._saveGuard.confirm(c),l&&a&&Je.clear(l,a),this._draftClaim?.draftId===a?.draftId&&(this._draftClaim=null,this._claimedScope=null),this._coach.afterSave(),!0}catch(t){if(!u())return!1;const e=this._guardedSaveFailure(t);return this._saveIssue=e.issue,e.deleted&&(this._groupDeleted=!0),this._saveGuard.fail(c,e.message),this._checkpointDraft(),!1}}async _reviewLatest(){if(this._writeReview={kind:"required"},!this._hass||!this._entityId||!this._isAdmin||this._savedRead||this._runtimeBlocked)return;this._endLightGesture();const t=this._beginSavedRead();this._loadGeneration++,this._load={...this._load,loading:!1};const e=()=>this._ownsSavedRead(t)&&this.isConnected&&this._isAdmin;try{const t=await this._readLatestSaved(e,this._knownEntryId,mt.guardedSave.incompatibleRead);if(!t?.valid())return;const{latest:i,curves:s,writeReview:r}=t;if("uncertain"===this._saveIssue&&this._submittedIntent&&Ge(i.entities,this._submittedIntent)&&Ge(Ue(this._rawBaseline,Ee(Ne(this._originalCurves,this._curves))),this._submittedIntent))return this._installRecovery(i,s,s),void(this._saveState={phase:"error",message:mt.guardedSave.present});this._saveReview={writeReview:r,latest:i,curves:s,members:He(this._originalCurves,this._curves,s)}}catch(t){if(!e())return;"not_found"===t?.code&&(this._groupDeleted=!0,this._saveIssue="not_found"),this._saveState={phase:"error",message:t instanceof rs?t.message:mt.guardedSave.readFailed}}finally{this._finishSavedRead(t)}}_installRecovery(t,e,i){const s=new Map(this._curves.map(t=>[t.entityId,t.visible]));this._stopCurveAnimation(),this._stopDrawIn(),this._stopDrawOut(),this._stopRipple();const r=t=>t.map(t=>({...t,visible:s.get(t.entityId)??!0}));this._baseline=t,this._knownEntryId=t.config_entry_id,this._subscribeDraft(),this._rawBaseline=t.entities,this._membershipBaseline=null,this._originalCurves=r(Ae(e)),this._curves=r(Ae(i)),this._undoStack=Re(e,i)?[]:[Ae(this._originalCurves)],this._dirtyVersion++,this._cleanVersion=Re(e,i)?this._dirtyVersion:this._dirtyVersion-1,this._curves.some(t=>t.entityId===this._selectedCurveId)||(this._selectedCurveId=null),this._saveIssue=null,this._submittedIntent=null,this._loadGeneration++,this._load={...this._load,loaded:!0,loading:!1,loadedEntityId:this._entityId,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0,loadError:null},this._dispatchSave({type:"reset"})}_dismissSaveReview(){const t=this._retainedReview;this._retainedReview=null,this._saveReview=null,t&&!t.localCopy&&Je.release(t.scope,t.claim)}_acceptSaveReview(t){const e=this._saveReview;if(!e||!this._isAdmin||this._draftAuthStale||this._runtimeBlocked)return void(this._runtimeBlocked&&this._dismissSaveReview());const i=e.writeReview;if(!this._writeReviewCurrent(i))return this._dismissSaveReview(),void(this._draftNotice=mt.drafts.savedChanged);const s=this._retainedReview;return s&&JSON.stringify(this._draftScope())!==JSON.stringify(s.scope)?(this._dismissSaveReview(),void(this._draftNotice=mt.drafts.changed)):!s||s.localCopy||Je.owns(s.scope,s.claim)?(s&&(this._draftClaim=s.localCopy?null:s.claim,this._claimedScope=s.localCopy?null:s.scope,this._retainedReview=null,this._resumeTicket=null,this._draftLost=!1,s.localCopy&&(this._draftOwner=crypto.randomUUID())),this._writeReview=i?{kind:"accepted",stamp:i}:{kind:"required"},this._resumeUnverified=!1,this._resumePayload=null,this._installRecovery(e.latest,e.curves,function(t,e,i){const s=new Map(e.filter(t=>"removed"!==t.kind&&i.has(t.entityId)).map(t=>[t.entityId,t.local]));return Ae(t).map(t=>({...t,controlPoints:s.get(t.entityId)?.controlPoints.map(t=>({...t}))??t.controlPoints}))}(e.curves,e.members,t.detail.keep)),this._dismissSaveReview(),void this._checkpointDraft()):(this._dismissSaveReview(),void(this._draftNotice=mt.drafts.changed))}_retryLoad(){this._load=function(t){return{...t,loaded:!1,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._tryLoadCurves()}_reloadCurvesAfterCurrentLoad(t){const{state:e,runNow:i}=function(t,e){const i={...t,loaded:!1};return i.loading?{state:{...i,reloadAfterLoadEntityId:e},runNow:!1}:{state:i,runNow:!0}}(this._load,t);this._load=e,i&&this._tryLoadCurves()}_reloadPendingDirtyResponse(){const{state:t,reloadEntityId:e}=function(t,e){const i=t.pendingReloadEntityId;return i&&i===e?{state:{...t,pendingReloadEntityId:void 0},reloadEntityId:i}:{state:t}}(this._load,this._entityId);this._load=t,e&&this._reloadCurvesAfterCurrentLoad(e)}_onCancel(){if(this._endLightGesture(),this._dismissInvitation(),this._cancelAnimating)return;const t=this._draftLost||this._resumeUnverified;this.discardNavigationDraft(),t&&(this._resumeUnverified=!0,this._verifyAfterDiscard=!0),this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview(),this._undoStack=[],this._animateCurvesTo(Ae(this._originalCurves),()=>{this._selectedCurveId=!0===this._config.firstRun&&"choose_shape"===this._coach.phase?this._curves[0]?.entityId??null:null,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:this._selectedCurveId}),this._dispatchSave({type:"reset"}),this._suppressDraftCapture=!1,t&&this._entityId&&this._reloadCurvesAfterCurrentLoad(this._entityId)})}_renderLoadingSkeleton(){return q`
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-graph" aria-hidden="true">
          <span class="loading-curve primary"></span>
          <span class="loading-curve warm"></span>
          <span class="loading-curve cool"></span>
          <span class="loading-point one"></span>
          <span class="loading-point two"></span>
          <span class="loading-point three"></span>
        </div>
        <div class="loading-caption">${mt.card.loading}</div>
      </div>
    `}_renderGraphInsight(){if(this._isShowingPresetGraphTrial&&this._presetGraphTrial){return this._selectedCurve?q`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${mt.presets.trying(this._presetGraphTrial.name)}
            >${mt.presets.trying(this._presetGraphTrial.name)}</span
          >
        </div>
      `:K}const t=ci(this._curves,this._selectedCurveId);return t?q`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${t.primary}>${t.primary}</span>
      </div>
    `:K}_renderGraphWorkbenchInsight(){if(this.experimentalFirstUse){const t=this._selectedCurve?.friendlyName;if(this._invitation.curve||this._invitationEditHint)return q`<div class="graph-insight invitation-insight">
          <span class="graph-insight-primary" title=${t??""}>${t}</span>
          <span class="graph-insight-secondary"
            >${this._invitation.curve?mt.invitation.example:this._invitationEditHint}</span
          >
        </div>`}else if(this.canvasHelp&&(this._invitation.curve||this._invitationEditHint)){const t=this._invitation.curve?this._selectedCurve?.friendlyName:this._invitationEditHint;return q`<div class="graph-insight invitation-insight">
        <span class="graph-insight-primary" title=${t??""}>${t}</span>
      </div>`}if(this._isAdmin&&"inactive"!==this._coach.phase){const t="choose_shape"===this._coach.phase?mt.coach.chooseTitle:"complete"===this._coach.phase?mt.coach.savedTitle:mt.coach.readyTitle,e="choose_shape"===this._coach.phase?mt.coach.chooseBody:"complete"===this._coach.phase?mt.coach.savedBody:mt.coach.readyBody;return q`
        <div class="coach-prompt" role="status" aria-live="polite">
          <span class="coach-copy"><strong>${t}</strong><span>${e}</span></span>
          <button
            type="button"
            class="coach-dismiss"
            aria-label=${mt.coach.dismiss}
            title=${mt.coach.dismiss}
            @click=${this._dismissCoach}
          >
            ×
          </button>
        </div>
      `}if(this._isShowingPresetGraphTrial&&this._presetGraphTrial)return q`
        <div class="graph-insight trial" role="status" aria-live="polite">
          <span
            class="graph-insight-primary"
            title=${mt.presets.trying(this._presetGraphTrial.name)}
            >${mt.presets.trying(this._presetGraphTrial.name)}</span
          >
        </div>
      `;const t=ci(this._curves,this._selectedCurveId);return t?q`
      <div class="graph-insight" role="note">
        <span class="graph-insight-primary" title=${t.primary}>${t.primary}</span>
      </div>
    `:K}_renderGraphWorkbench(){const t=this._renderShapeChips();return t===K?q`<div class="graph-workbench ${this._selectedCurve?"has-selection":""}">
        ${this._isAdmin&&"inactive"!==this._coach.phase?this._renderGraphWorkbenchInsight():this._renderGraphInsight()}
        <div class="shape-chip-reserve" aria-hidden="true"></div>
      </div>`:q`<div class="graph-workbench has-selection">
      ${this._renderGraphWorkbenchInsight()}${t}
    </div>`}_renderContextLine(){if(this.canvasHelp&&this._invitation.curve)return q`<div class="context-line canvas-guidance" tabindex="-1">
        <span class="canvas-guidance-text">${mt.canvasHelp.guidance}</span>
        <button
          type="button"
          class="canvas-guidance-action canvas-replay invitation-dismiss"
          @click=${()=>this._toggleCanvasHelp(!0)}
        >
          ${mt.canvasHelp.replay}
        </button>
        <button
          type="button"
          class="canvas-guidance-action canvas-done invitation-dismiss"
          @click=${()=>this._closeCanvasHelp()}
        >
          ${mt.canvasHelp.done}
        </button>
      </div>`;if(this.canvasHelp&&this._canvasHelpNotice)return q`<div class="context-line canvas-guidance" tabindex="-1">
        <span class="canvas-guidance-text canvas-notice">${this._canvasHelpNotice}</span>
      </div>`;const t=this._selectedCurve;return q`<div class="context-line" tabindex="-1">
      ${t?q`<span class="context-name" title=${t.friendlyName}
              >${t.friendlyName}</span
            >
            <button
              type="button"
              class="context-clear"
              aria-label=${mt.context.clearAria}
              @click=${this._clearSelection}
            >
              ${mt.context.allLights}
            </button>`:q`<span class="context-name all">${mt.context.allLights}</span>`}
    </div>`}_renderHeaderHelp(){return this.canvasHelp?this._isAdmin&&this._curves.length>0&&!this._load.loading?q`<button
            type="button"
            class="canvas-help invitation-dismiss"
            aria-expanded=${!!this._invitation.curve}
            @click=${()=>this._toggleCanvasHelp()}
          >
            ${this._invitation.curve?mt.canvasHelp.close:mt.canvasHelp.open}
          </button>`:K:q`${this.experimentalFirstUse&&this._isAdmin?q`<button
          type="button"
          class="invitation-replay ${this._invitation.curve?"invitation-dismiss":""}"
          aria-label=${this._invitation.curve?mt.invitation.dismiss:mt.invitation.replay}
          title=${this._invitation.curve?mt.invitation.dismiss:mt.invitation.replay}
          ?disabled=${!this._invitation.curve&&!this._canRunInvitation}
          @click=${()=>this._invitation.curve?this._dismissInvitation():this._startInvitation()}
        >
          ${this._invitation.curve?"×":"↻"}
        </button>`:this._isAdmin&&this._curves.length>0&&!this._load.loading?q`<button
            type="button"
            class="coach-help"
            aria-label=${mt.coach.help}
            title=${mt.coach.help}
            aria-expanded=${"inactive"!==this._coach.phase}
            ?disabled=${this._saving||this._cancelAnimating||this._membershipLocked}
            @click=${()=>this._toggleCoach()}
          >
            ?
          </button>`:K}`}_renderHelp(){return q`<div class="editor-help" tabindex="-1">${this._renderHeaderHelp()}</div>`}_renderCommands(){const t=!this._canEditCurves,e=(this._runtimeBlocked?mt.guardedSave.runtime:this._saveError)??("conflict"===this._saveIssue?mt.guardedSave.conflict:"uncertain"===this._saveIssue?mt.guardedSave.uncertain:null);return q`<div
      class="editor-commands"
      tabindex="-1"
      role="group"
      aria-label="Brightness editor actions"
    >
      <span title=${mt.scrubber.watchGuidance}
        >${mi(this._previewActive,(t||this._previewController.blocked)&&!this._previewActive,()=>this._onPreviewToggle())}</span
      >
      <div class="command-status">
        ${this._previewController.otherWatching?q`<span role="status">${mt.restoration.otherWatching}</span>`:K}
        ${this._previewController.mutationBlocked?q`<span role="status">${mt.restoration.operationBlocked}</span>`:K}
        ${this._previewController.admissionIssue?q`<span role="status">${this._previewController.admissionIssue}</span>`:K}
        ${this._previewController.reviewSessions.some(t=>t.lights.size>0)&&!this._previewActive?q`<span role="status"
              >${this._previewController.sessions.some(t=>"stopping"===t.phase)?mt.restoration.waiting:this._previewController.blocked?mt.restoration.title:[...this._previewController.sessions.at(-1)?.lights.values()??[]].every(t=>"restore-acknowledged"===t.outcome)?mt.restoration.acknowledged:mt.restoration.reviewed}
              <button type="button" class="command-retry" @click=${()=>this._openRestoration()}>
                ${mt.restoration.review}
              </button></span
            >`:K}
        ${e?q`<span role="alert"
              >${e}
              <button
                type="button"
                class="command-retry"
                ?disabled=${this._savedRead||this._runtimeBlocked||"refresh"===this._saveIssue||"not_found"===this._saveIssue}
                @click=${()=>this._saveIssue?this._reviewLatest():this._onSave()}
              >
                ${"conflict"===this._saveIssue?mt.guardedSave.review:this._saveIssue?mt.guardedSave.check:mt.footer.retry}
              </button></span
            >`:q`<span role="status" aria-live="polite"
              >${this._saveSuccess?mt.footer.saved:"readonly"===this._saveIssue?mt.guardedSave.readOnly:"incompatible"===this._saveIssue?mt.guardedSave.incompatible:this._membershipBaseline?mt.guardedSave.checking:""}</span
            >`}
      </div>
      ${this._renderNavigationDrafts()}
      <curve-footer
        .persistent=${!0}
        .dirty=${this._isDirty||this._cancelAnimating||!!this._saveError}
        .readOnly=${!this._isAdmin}
        .saving=${this._saving||this._membershipLocked}
        .animating=${this._cancelAnimating}
        .saveDisabled=${!this._canGuardedSave}
        .canUndo=${this._undoStack.length>0&&this._canUndoCurves}
        @save-curves=${()=>this._onSave()}
        @cancel-curves=${()=>this._onCancel()}
        @undo-curves=${()=>this._undo()}
      ></curve-footer>
    </div>`}render(){const t=this._graphCurves,e=this._isAdmin&&(this._membershipLocked||this._isDirty||this._saving||this._cancelAnimating||this._undoStack.length>0||this._previewActive||this._saveSuccess||!!this._saveError);return q`
      <div
        class="card ${this._embedded?"embedded":""} ${this.experimentalFirstUse?"first-use-experiment":""}"
        role="region"
        tabindex="-1"
        aria-label="Brightness editor"
      >
        <span class="sr-only invitation-announcement" role="status" aria-atomic="true"
          >${this._invitation.curve?mt.invitation.announcement(this._invitation.curve.friendlyName):this._canvasHelpNotice??""}</span
        >
        ${this._hostedToolbar?K:q`<div class="header">
              <h2>${this._config.title??"Brightness shapes"}</h2>
              ${this._renderHelp()}
            </div>`}

        <div class="workspace">
          <div class="editor-column">
            <div class="main-stack">
              ${this._renderContextLine()}
              ${this._load.loading?this._renderLoadingSkeleton():q`<div class="graph-panel">
                    ${this._renderGraphWorkbench()}
                    <curve-graph
                      .curves=${t}
                      .selectedCurveId=${this._selectedCurveId}
                      .hoveredCurveId=${this._hoveredCurveId}
                      .entityId=${this._entityId??null}
                      .readOnly=${!this._canEditCurves}
                      .showXAxisLabel=${!1}
                      .scrubberPosition=${this._effectiveScrubberPosition}
                      .previewCurve=${this._presetPreviewCurve}
                      .exampleEntityId=${this._invitation.curve?.entityId??null}
                      .exampleCueAnimating=${this._invitation.cueAnimating}
                      .exampleInstruction=${this._invitation.curve&&this._invitation.showInstruction?mt.invitation.drag:null}
                      .joy=${this._joy}
                      .curveFrame=${this._curveFrame}
                      .drawIn=${this._drawIn}
                      .drawOut=${this._drawOut}
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
            </div>
            <div class="control-slot">
              <div class="control-dock" ?data-narrow=${this._narrowLayout}>
                <div class="room-surface">
                  ${this._curves.length>0&&!this._load.loading?q`<curve-scrubber
                        .curves=${t}
                        .showLabel=${!0}
                        .alignToAxis=${!this._narrowLayout}
                        .contextKey=${`${this._entityId}:${this._narrowLayout}`}
                        .example=${!!this._invitation.curve}
                        .firstUseHints=${this.experimentalFirstUse}
                        .invitation=${this._invitationTogether}
                        .readOnly=${!this._canEditCurves}
                        .showPreviewToggle=${!1}
                        .canPreview=${this._canEditCurves||this._previewActive}
                        .previewActive=${this._previewActive}
                        .dirty=${this._isDirty}
                        .position=${this._effectiveScrubberPosition}
                        @scrubber-move=${this._onScrubberMove}
                        @scrubber-start=${this._onScrubberStart}
                        @scrubber-end=${this._onScrubberEnd}
                        @preview-toggle=${this._onPreviewToggle}
                      ></curve-scrubber>`:K}
                </div>
                <div class="footer-slot ${e?"active":""}">
                  ${this._renderCommands()}
                </div>
              </div>
            </div>
          </div>

          <aside class="side-rail" aria-label=${mt.card.railAria}>
            <curve-legend
              .curves=${t}
              .exampleEntityId=${this._invitation.curve?.entityId??null}
              .selectedCurveId=${this._selectedCurveId}
              .hoveredCurveId=${this._hoveredCurveId}
              .scrubberPosition=${this._effectiveScrubberPosition}
              .readOnly=${!this._canEditCurves||this._load.loading}
              .editingCurves=${this._curves}
              .contextKey=${`${this._entityId}:${this._narrowLayout}:${this._load.loadedEntityId}`}
              @focus-curve=${this._onFocusCurve}
              @hover-curve=${this._onHoverCurve}
              @light-level-start=${this._onLightLevelStart}
              @light-level-input=${this._onLightLevelInput}
              @light-level-end=${this._onLightLevelEnd}
              .showManage=${this._isAdmin&&!this._groupDeleted}
              .canManage=${this._canManageLights}
              .managing=${this._managingLights}
              @select-curve=${this._onSelectCurve}
              @toggle-curve=${this._onToggleCurve}
              @edit-lights=${this._openMembershipEditor}
              @delete-group=${this._onDeleteGroup}
            ></curve-legend>
            ${this._manageError?q`<div class="error" role="alert">${os} ${this._manageError}</div>`:K}
          </aside>
        </div>

        ${this._saveReview?q`<save-conflict-review
              .review=${this._saveReview}
              @review-dismiss=${()=>this._dismissSaveReview()}
              @review-accept=${this._acceptSaveReview}
            ></save-conflict-review>`:K}
        ${this._restorationOpen?q`<preview-restoration-dialog
              .rows=${this._previewController.reviewSessions.flatMap(t=>[...t.lights.values()].map(t=>({...t,current:ti(this._hass,t.entityId),eligible:!t.pending&&!t.disposition&&this._curves.some(e=>e.entityId===t.entityId)&&null!==ti(this._hass,t.entityId)})))}
              .actionable=${ii(this._hass)&&this._isAdmin&&!this._runtimeBlocked&&!this._authInvalidated}
              .token=${this._previewController.reviewToken()}
              @restoration-close=${()=>this._closeRestoration()}
              @restoration-keep=${t=>this._reviewRestoration(t,!1)}
              @restoration-restore=${t=>this._reviewRestoration(t,!0)}
            ></preview-restoration-dialog>`:K}
        ${this._membershipOpen&&this._hass&&this._entityId?q`<light-membership-dialog
              .hass=${this._hass}
              .groupEntityId=${this._entityId}
              .beginApply=${t=>this._previewController.beginMutation(t)}
              @membership-close=${this._closeMembershipEditor}
              @membership-applied=${this._onMembershipApplied}
            ></light-membership-dialog>`:K}

        <div class="status-stack">
          ${this._membershipStatus?q`<div class="success" role="status" aria-live="polite">
                ${this._membershipStatus}
              </div>`:K}
          ${this._load.loadError?q`<div class="error" role="alert">
                ${os} Failed to load curves
                <button type="button" class="retry-link" @click=${this._retryLoad}>Retry</button>
              </div>`:K}
          ${this._groupDeleted?q`<div class="error" role="status">
                ${os} This Lightener group was deleted. Remove this card or point it at a
                different group.
              </div>`:K}
        </div>
      </div>
    `}}hs.styles=a`
    ${vi}${fi}
    .navigation-drafts {
      flex: 1 1 100%;
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      overflow-wrap: anywhere;
    }
    .navigation-drafts > span {
      flex: 1 1 100%;
      min-width: 0;
    }
  `,t([vt({attribute:!1})],hs.prototype,"experimentalFirstUse",void 0),t([vt({attribute:!1})],hs.prototype,"canvasHelp",void 0),t([gt()],hs.prototype,"_canvasHelpNotice",void 0),t([gt()],hs.prototype,"_invitationEditHint",void 0),t([gt()],hs.prototype,"_invitationTogether",void 0),t([gt()],hs.prototype,"_curves",void 0),t([gt()],hs.prototype,"_originalCurves",void 0),t([gt()],hs.prototype,"_config",void 0),t([gt()],hs.prototype,"_selectedCurveId",void 0),t([gt()],hs.prototype,"_saveState",void 0),t([vt({attribute:!1})],hs.prototype,"draftSurface",void 0),t([gt()],hs.prototype,"_draftLost",void 0),t([gt()],hs.prototype,"_savedRead",void 0),t([gt()],hs.prototype,"_draftNotice",void 0),t([gt()],hs.prototype,"_resumeUnverified",void 0),t([gt()],hs.prototype,"_baseline",void 0),t([gt()],hs.prototype,"_saveIssue",void 0),t([gt()],hs.prototype,"_saveReview",void 0),t([gt()],hs.prototype,"_load",void 0),t([gt()],hs.prototype,"_manageError",void 0),t([gt()],hs.prototype,"_managingLights",void 0),t([gt()],hs.prototype,"_groupDeleted",void 0),t([gt()],hs.prototype,"_scrubberPosition",void 0),t([gt()],hs.prototype,"_cancelAnimating",void 0),t([gt()],hs.prototype,"_joy",void 0),t([gt()],hs.prototype,"_drawIn",void 0),t([gt()],hs.prototype,"_drawOut",void 0),t([gt()],hs.prototype,"_ripple",void 0),t([gt()],hs.prototype,"_morphLine",void 0),t([gt()],hs.prototype,"_hass",void 0),t([gt()],hs.prototype,"_narrowLayout",void 0),t([vt({attribute:!1})],hs.prototype,"toolbarHost",void 0),t([gt()],hs.prototype,"_previewActive",void 0),t([gt()],hs.prototype,"_restorationOpen",void 0),t([gt()],hs.prototype,"_hoveredCurveId",void 0),t([gt()],hs.prototype,"_presetGraphTrial",void 0),t([gt()],hs.prototype,"_membershipOpen",void 0),t([gt()],hs.prototype,"_membershipStatus",void 0),Ce(Ie,hs);export{hs as LightenerCurveCard,ls as LightenerCurveCardEditor};
