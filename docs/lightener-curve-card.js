function t(t,e,i,s){var r,n=arguments.length,o=n<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(o=(n<3?r(o):n>3?r(e,i,o):r(e,i))||o);return n>3&&o&&Object.defineProperty(e,i,o),o}"function"==typeof SuppressedError&&SuppressedError;const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),r=new WeakMap;let n=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&r.set(e,t))}return t}toString(){return this.cssText}};const o=t=>new n("string"==typeof t?t:t+"",void 0,s),a=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new n(i,t,s)},h=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return o(e)})(t):t,{is:l,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:_}=Object,v=globalThis,g=v.trustedTypes,m=g?g.emptyScript:"",f=v.reactiveElementPolyfillSupport,y=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},w=(t,e)=>!l(t,e),x={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:w};Symbol.metadata??=Symbol("metadata"),v.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&d(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:r}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const n=s?.call(this);r?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const t=_(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const t=this.properties,e=[...p(t),...u(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(h(t))}else void 0!==t&&e.push(h(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),r=e.litNonce;void 0!==r&&s.setAttribute("nonce",r),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(e,i.type);this._$Em=t,null==r?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=s;const n=r.fromAttribute(e,t.type);this[s]=n??this._$Ej?.get(s)??n,this._$Em=null}}requestUpdate(t,e,i,s=!1,r){if(void 0!==t){const n=this.constructor;if(!1===s&&(r=this[t]),i??=n.getPropertyOptions(t),!((i.hasChanged??w)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:r},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==r||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[y("elementProperties")]=new Map,$[y("finalized")]=new Map,f?.({ReactiveElement:$}),(v.reactiveElementVersions??=[]).push("2.1.2");const I=globalThis,k=t=>t,S=I.trustedTypes,C=S?S.createPolicy("lit-html",{createHTML:t=>t}):void 0,E="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,A="?"+P,T=`<${A}>`,R=document,L=()=>R.createComment(""),M=t=>null===t||"object"!=typeof t&&"function"!=typeof t,D=Array.isArray,G="[ \t\n\f\r]",H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,F=/>/g,U=RegExp(`>|${G}(?:([^\\s"'>=/]+)(${G}*=${G}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),N=/'/g,B=/"/g,z=/^(?:script|style|textarea|title)$/i,q=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),W=q(1),V=q(2),j=Symbol.for("lit-noChange"),K=Symbol.for("lit-nothing"),Y=new WeakMap,J=R.createTreeWalker(R,129);function X(t,e){if(!D(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}class Z{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let r=0,n=0;const o=t.length-1,a=this.parts,[h,l]=((t,e)=>{const i=t.length-1,s=[];let r,n=2===e?"<svg>":3===e?"<math>":"",o=H;for(let e=0;e<i;e++){const i=t[e];let a,h,l=-1,d=0;for(;d<i.length&&(o.lastIndex=d,h=o.exec(i),null!==h);)d=o.lastIndex,o===H?"!--"===h[1]?o=O:void 0!==h[1]?o=F:void 0!==h[2]?(z.test(h[2])&&(r=RegExp("</"+h[2],"g")),o=U):void 0!==h[3]&&(o=U):o===U?">"===h[0]?(o=r??H,l=-1):void 0===h[1]?l=-2:(l=o.lastIndex-h[2].length,a=h[1],o=void 0===h[3]?U:'"'===h[3]?B:N):o===B||o===N?o=U:o===O||o===F?o=H:(o=U,r=void 0);const c=o===U&&t[e+1].startsWith("/>")?" ":"";n+=o===H?i+T:l>=0?(s.push(a),i.slice(0,l)+E+i.slice(l)+P+c):i+P+(-2===l?e:c)}return[X(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]})(t,e);if(this.el=Z.createElement(h,i),J.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=J.nextNode())&&a.length<o;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(E)){const e=l[n++],i=s.getAttribute(t).split(P),o=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:o[2],strings:i,ctor:"."===o[1]?st:"?"===o[1]?rt:"@"===o[1]?nt:it}),s.removeAttribute(t)}else t.startsWith(P)&&(a.push({type:6,index:r}),s.removeAttribute(t));if(z.test(s.tagName)){const t=s.textContent.split(P),e=t.length-1;if(e>0){s.textContent=S?S.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],L()),J.nextNode(),a.push({type:2,index:++r});s.append(t[e],L())}}}else if(8===s.nodeType)if(s.data===A)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=s.data.indexOf(P,t+1));)a.push({type:7,index:r}),t+=P.length-1}r++}}static createElement(t,e){const i=R.createElement("template");return i.innerHTML=t,i}}function Q(t,e,i=t,s){if(e===j)return e;let r=void 0!==s?i._$Co?.[s]:i._$Cl;const n=M(e)?void 0:e._$litDirective$;return r?.constructor!==n&&(r?._$AO?.(!1),void 0===n?r=void 0:(r=new n(t),r._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=r:i._$Cl=r),void 0!==r&&(e=Q(t,r._$AS(t,e.values),r,s)),e}class tt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??R).importNode(e,!0);J.currentNode=s;let r=J.nextNode(),n=0,o=0,a=i[0];for(;void 0!==a;){if(n===a.index){let e;2===a.type?e=new et(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new ot(r,this,t)),this._$AV.push(e),a=i[++o]}n!==a?.index&&(r=J.nextNode(),n++)}return J.currentNode=R,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class et{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=K,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),M(t)?t===K||null==t||""===t?(this._$AH!==K&&this._$AR(),this._$AH=K):t!==this._$AH&&t!==j&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>D(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==K&&M(this._$AH)?this._$AA.nextSibling.data=t:this.T(R.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Z.createElement(X(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new tt(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=Y.get(t.strings);return void 0===e&&Y.set(t.strings,e=new Z(t)),e}k(t){D(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const r of t)s===e.length?e.push(i=new et(this.O(L()),this.O(L()),this,this.options)):i=e[s],i._$AI(r),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=k(t).nextSibling;k(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class it{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,r){this.type=1,this._$AH=K,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=K}_$AI(t,e=this,i,s){const r=this.strings;let n=!1;if(void 0===r)t=Q(this,t,e,0),n=!M(t)||t!==this._$AH&&t!==j,n&&(this._$AH=t);else{const s=t;let o,a;for(t=r[0],o=0;o<r.length-1;o++)a=Q(this,s[i+o],e,o),a===j&&(a=this._$AH[o]),n||=!M(a)||a!==this._$AH[o],a===K?t=K:t!==K&&(t+=(a??"")+r[o+1]),this._$AH[o]=a}n&&!s&&this.j(t)}j(t){t===K?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class st extends it{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===K?void 0:t}}class rt extends it{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==K)}}class nt extends it{constructor(t,e,i,s,r){super(t,e,i,s,r),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??K)===j)return;const i=this._$AH,s=t===K&&i!==K||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==K&&(i===K||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class ot{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const at={I:et},ht=I.litHtmlPolyfillSupport;ht?.(Z,et),(I.litHtmlVersions??=[]).push("3.3.2");const lt=(t,e,i)=>{const s=i?.renderBefore??e;let r=s._$litPart$;if(void 0===r){const t=i?.renderBefore??null;s._$litPart$=r=new et(e.insertBefore(L(),t),t,void 0,i??{})}return r._$AI(t),r},dt=globalThis;let ct=class extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=lt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return j}};ct._$litElement$=!0,ct.finalized=!0,dt.litElementHydrateSupport?.({LitElement:ct});const pt=dt.litElementPolyfillSupport;pt?.({LitElement:ct}),(dt.litElementVersions??=[]).push("4.2.2");const ut={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:w},_t=(t=ut,e,i)=>{const{kind:s,metadata:r}=i;let n=globalThis.litPropertyMetadata.get(r);if(void 0===n&&globalThis.litPropertyMetadata.set(r,n=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const r=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,r,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const r=this[s];e.call(this,i),this.requestUpdate(s,r,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};function vt(t){return(e,i)=>"object"==typeof i?_t(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function gt(t){return vt({...t,state:!0,attribute:!1})}const mt={drafts:{savedChanged:"Saved state changed. Review again before continuing.",changedLights:"changed lights",changedLight:"changed light",unverified:"Check the latest saved shapes before continuing. Your local draft is unchanged.",unavailable:"Navigation recovery is unavailable until your signed-in identity and saved group are ready. Keep this editor open to preserve your draft.",notRetained:"Latest edits could not be retained for navigation. Keep this editor open; an older checkpoint may remain.",changed:"That draft changed or was opened elsewhere. Choose from the current drafts.",openedElsewhere:"This draft was opened elsewhere. This local copy cannot change lights or saved shapes.",reviewLocal:"Review local copy",unavailableSaved:"The latest saved group is unavailable for recovery. The retained draft is unchanged.",inconsistent:"This checkpoint does not match its saved baseline and cannot be recovered.",available:"Unsaved draft available:",older:"Older checkpoint only; latest edits were not retained:",recover:"Recover draft",discard:"Discard draft",unknown:"An earlier save has an unresolved outcome. Review saved shapes before saving."},saveReview:{title:"Review latest saved shapes",body:"Your draft stays unchanged until you choose. Continuing starts fresh Undo: Undo returns to the latest saved shapes. This review does not save or change any lights.",keep:"Keep my shape",saved:"Use saved shape",removed:"Removed from this group. Its local edit cannot be reapplied.",alreadySaved:"Your shape is already saved.",unchanged:"Your shape can be kept; the saved shape has not changed.",acknowledgeRemoved:"I understand edits to removed lights will be dropped.",back:"Back to draft",useSaved:"Use saved shapes",continue:"Continue editing"},guardedSave:{conflict:"Saved shapes changed. Review the latest saved shapes.",refresh:"Refresh this editor before saving. Your draft stays here until you leave.",notFound:"This group was removed. Your draft is still here.",rolledBack:"The save was rolled back. Check saved state before trying again.",runtime:"Saved shapes and lights may disagree. Recovery is required before editing further.",unauthorized:"You do not have permission to save these shapes.",unknownEntities:"A light is no longer in this group. Review the latest saved shapes.",invalid:"Save failed. Check the shape points before trying again.",uncertain:"Save outcome unknown. Check saved state before trying again.",readFailed:"Could not check saved shapes. Your draft is unchanged.",incompatibleRead:"The backend cannot provide a guarded saved state.",present:"Your edits are now present in the saved shapes.",readOnly:"Read-only: an administrator can save shapes for this group.",incompatible:"Update the backend and refresh before saving. Your draft stays here.",checking:"Checking saved shapes…",review:"Review latest",check:"Check saved state",invalidResponse:"Invalid saved shapes response"},invitation:{example:"Example shape",dragPoint:"Drag this point",dismiss:"Dismiss example",replay:"Replay example shape",together:"Try the lights together",touchAdd:"Double-tap the shape to add a point",mouseAdd:"Double-click the shape to add a point",keyboardAdd:"Press Enter on a point to add another",description:"Example shape. Changing a point keeps this shape as an unsaved edit. Undo restores your previous shape.",values:"Example brightness values",forLight:t=>`Example shape for ${t}`},canvasHelp:{brightenLight:"Make this light brighter",dimLight:"Dim this light",adjustRoom:"Adjust room brightness",addPoint:"Add a point",removePoint:"Remove this point",open:"Show me how",choose:t=>`1/4 · Start with ${t}`,steps:{point:"2/4 · Move one point up and down",room:"3/4 · Sweep Room brightness",complete:"Your shapes are back. Replay or try it yourself."},paused:"Paused. Edit a point, Replay or Done.",mouseAdd:"4/4 · Double-click to add a point",mouseRemove:"Right-click the point to remove it",touchAdd:"4/4 · Double-tap to add a point",touchRemove:"Hold the point to remove it",keyboardPoint:"2/4 · Arrow keys move a point",keyboardAdd:"4/4 · Enter adds a point beside the focused point",keyboardRemove:"Delete removes the focused point",replay:"Replay",done:"Done",draft:"Save or cancel your draft before starting the canvas example. Your edits are unchanged.",watching:"Turn off Watch room react before starting the canvas example.",busy:"The editor is busy. Try the canvas example when it is ready."},scrubber:{title:"Room brightness",sliderAria:"Room brightness",off:"Off",watchButton:"Watch room react",watchGuidance:"Watch changes your lights. Turning it off puts them back, which can overwrite changes made elsewhere meanwhile. A lost connection leaves them as they are.",watchHintBody:"Shape a light and watch it react. Save, Cancel or turning Watch off tries to put your lights back.",watchHintDismiss:"Got it",watchingHeldStatus:"Watching unsaved changes · Save keeps the shapes.",meaningAll:t=>1===t?"1 light on":`All ${t} lights on`,meaningSome:(t,e)=>`${t} of ${e} lights on`,meaningNone:t=>1===t?"Light off":"All lights off",meaningFollowing:"Your room follows"},restoration:{otherWatching:"Another editor is watching these lights. Turn Watch off there first.",operationBlocked:"Another light or group change in this page is still running.",membershipBlocked:"Watch is still on or putting lights back. Try again in a moment.",overlap:"Another editor is watching some of these lights. Turn Watch off there first."},footer:{undo:"Undo",cancel:"Cancel",save:"Save",saving:"Saving…",saved:"Saved",failed:"Save failed",retry:"Retry"},coach:{help:"Brightness tips",dismiss:"Dismiss tip",chooseTitle:"Dim a bright light",chooseBody:"Select the light, then choose Dim.",readyTitle:"Ready to save",readyBody:"Save now, or try “Watch room react” first.",savedTitle:"Shape saved",savedBody:"Adjust group brightness in Home Assistant."},presets:{panelAria:"Shapes for selected light",title:"Shapes",emptyTitle:"Select a light.",emptyBody:"Shapes apply to one light at a time.",forLight:t=>`Shapes for ${t}`,explanation:"Choose a shape, then adjust it on the graph.",trying:t=>`Trying ${t}`,chooseForLight:t=>`Choose it to shape ${t}.`,defs:{linear:{name:"Equal brightness",description:"Matches the group brightness."},dim_accent:{name:"Dim accent",description:"Holds near 30% from halfway."},early_starter:{name:"Early starter",description:"Brightens early, then eases towards full brightness."},late_starter:{name:"Late starter",description:"Stays off through 40%, then rises progressively."}},chipLabels:{linear:"Equal",dim_accent:"Dim",early_starter:"Early",late_starter:"Late"}},legend:{brightnessAria:t=>`${t} brightness`,brightnessAt:(t,e)=>`${t} at ${e}% room brightness`,roomOff:"Raise room brightness to adjust this light.",off:"Off",title:"Lights",emptyCount:"No lights yet",listAria:t=>0===t?"No lights in this group":`${t} ${1===t?"light":"lights"} in this group`,deleteGroup:"Delete group…",deleteError:"Could not delete group.",deleteWrongGroup:"This light is not a Lightener Studio group.",deleteMissingEntry:"This group cannot be deleted here.",deleteConfirm:"Delete this group?",deleteCancel:"Cancel",deleteAction:"Delete group",updating:"Updating lights…",allLights:"All lights"},toolbar:{edit:"Edit",done:"Done",more:"More actions",editLights:"Edit lights…",newGroup:"New group…"},graph:{yAxisLabel:"Per-light brightness"},card:{railAria:"Room lights and shapes",loading:"Loading brightness shapes…"},membership:{title:"Edit lights",subtitle:"Choose which lights this group controls. Existing shapes stay exactly as they are.",close:"Close",search:"Search lights",searchPlaceholder:"Search name or ID…",areaFilter:"Area",allAreas:"All areas",currentGroupOnly:t=>`Current group only (${t})`,showExceptional:t=>`Show hidden & disabled (${t})`,candidateList:"Lights available to this group",loading:"Loading lights…",sourceEmpty:"No lights are available to add.",filterEmpty:"No lights match these filters.",clearFilters:"Clear search and area",scopeEmpty:"No lights in this view.",showAllLights:"Show all lights",exceptionalEmpty:t=>`${t} hidden or disabled ${1===t?"light":"lights"}.`,showExceptionalAction:"Show hidden & disabled",hidden:"Hidden",disabled:"Disabled",missing:"Missing",unavailable:"Unavailable",lightCheckboxLabel:(t,e)=>0===e.length?t:`${t}, ${e.join(", ")}`,resultSummary:(t,e,i)=>{const s=`${t} ${1===t?"light":"lights"} shown`;return e===i?`${s} · ${i} selected`:`${s} · ${e} of ${i} selected shown`},selectedCount:t=>`${t} selected`,cancel:"Cancel",apply:"Update lights",applying:"Updating…",applyingStatus:"Updating group lights.",updated:"Lights updated.",tryAgain:"Try again",loadError:"Could not load lights.",applyError:"Could not update lights.",emptyError:"Select at least one light.",conflictError:"This group changed. Close and reopen Edit lights.",disabledError:"A selected light is disabled in Home Assistant. Enable the light in Home Assistant settings, then try again.",reloadError:"The group could not be reloaded. Your previous selection was restored.",rollbackError:"The update failed and the group runtime may need attention. Open Integrations to retry."}},ft=[{id:"linear",...mt.presets.defs.linear,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:50,target:50},{lightener:100,target:100}]},{id:"dim_accent",...mt.presets.defs.dim_accent,controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:25,target:18},{lightener:50,target:30},{lightener:100,target:30}]},{id:"early_starter",...mt.presets.defs.early_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:3},{lightener:15,target:36},{lightener:25,target:55},{lightener:50,target:85},{lightener:65,target:93},{lightener:100,target:100}]},{id:"late_starter",...mt.presets.defs.late_starter,controlPoints:[{lightener:0,target:0},{lightener:1,target:0},{lightener:40,target:0},{lightener:55,target:10},{lightener:70,target:35},{lightener:85,target:65},{lightener:100,target:100}]}];function yt(t,e,i){const[s,r]=t,[n,o]=e;return s===r?n:n+(i-s)*(o-n)/(r-s)}function bt(t){const e=new Map;let i=null;e.set(0,0);for(const s of t)0!==s.lightener||0===s.target?e.set(s.lightener,s.target):i=s.target;if(null===i||e.has(1)||e.set(1,i),!e.has(100)){let t=-1,i=100;for(const[s,r]of e)0!==s&&s>t&&(t=s,i=r);e.set(100,i)}const s=[];for(const[t,i]of e)s.push({lightener:t,target:i});return s.sort((t,e)=>t.lightener-e.lightener),s}function wt(t,e){return function(t,e){if(0===t.length)return 0;const i=Math.max(0,Math.min(100,e));if(i<=t[0].lightener)return t[0].target;for(let e=1;e<t.length;e++){const s=t[e-1],r=t[e];if(i===r.lightener)return r.target;if(i<r.lightener)return yt([s.lightener,r.lightener],[s.target,r.target],i)}return t[t.length-1].target}(bt(t),e)}const xt=44,$t=12,It=300,kt=200,St=248;function Ct(t){return t>0?Math.min(1,320/St/t):1}function Et(t,e=300){return xt+t/100*e}function Pt(t){return $t+(1-t/100)*kt}function At(t,e=300){return(t-xt)/e*100}function Tt(t,e,i){return Math.max(e,Math.min(i,t))}function Rt(t,e,i=t[e]?.lightener){return 0===e||e===t.length-1&&100===t[e]?.lightener&&100===i}function Lt(t,e,i=t[e]?.lightener??0){if(e<=0)return{min:i,max:i};if(Rt(t,e,i))return{min:100,max:100};const s=t[e-1],r=t[e+1],n=Tt(i,(s?.lightener??0)+1,r?r.lightener-1:100),o=s?s.lightener+3:n,a=r?r.lightener-3:100;return{min:Math.min(n,o),max:Math.max(n,a)}}function Mt(t){const e=t.length;if(0===e)return{dx:[],tangents:[]};if(1===e)return{dx:[],tangents:[0]};const i=[],s=[],r=[];for(let n=0;n<e-1;n++)i.push(t[n+1].x-t[n].x),s.push(t[n+1].y-t[n].y),r.push(0===i[n]?0:s[n]/i[n]);const n=new Array(e).fill(0);if(2===e)return n[0]=r[0],n[1]=r[0],{dx:i,tangents:n};n[0]=r[0],n[e-1]=r[e-2];for(let t=1;t<e-1;t++)0===r[t-1]||0===r[t]||r[t-1]*r[t]<=0?n[t]=0:n[t]=(r[t-1]+r[t])/2;for(let t=0;t<e-1;t++){if(0===r[t]){n[t]=0,n[t+1]=0;continue}const e=n[t]/r[t],i=n[t+1]/r[t],s=e*e+i*i;if(s>9){const o=3/Math.sqrt(s);n[t]=o*e*r[t],n[t+1]=o*i*r[t]}}return{dx:i,tangents:n}}function Dt(t,e){return Math.max(0,Math.min(100,wt(t,e)))}function Gt(t,e){const i=bt(t).map(t=>({x:t.lightener,y:t.target}));return Math.max(0,Math.min(100,function(t,e){if(t.length<2)return 0;if(2===t.length){const[i,s]=t,r=s.x-i.x;if(0===r)return i.y;const n=(e-i.x)/r;return i.y+n*(s.y-i.y)}const{dx:i,tangents:s}=Mt(t);let r=0;for(let i=0;i<t.length-1;i++){if(e<=t[i+1].x){r=i;break}r=i}const n=i[r]||1,o=Tt((e-t[r].x)/n,0,1),a=n/3,h=1-o;return h*h*h*t[r].y+3*h*h*o*(t[r].y+s[r]*a)+3*h*o*o*(t[r+1].y-s[r+1]*a)+o*o*o*t[r+1].y}(i,e)))}const Ht=["#42a5f5","#ef5350","#5c6bc0","#ffa726","#ab47bc","#1565c0","#ec407a","#8d6e63","#ffca28","#7e57c2"];function Ot(t){if(t.length<2)return"";if(2===t.length)return`M${t[0].x},${t[0].y} L${t[1].x},${t[1].y}`;const{dx:e,tangents:i}=Mt(t);let s=`M${t[0].x},${t[0].y}`;for(let r=0;r<t.length-1;r++){const n=e[r]/3;s+=` C${t[r].x+n},${t[r].y+i[r]*n} ${t[r+1].x-n},${t[r+1].y-i[r+1]*n} ${t[r+1].x},${t[r+1].y}`}return s}function Ft(t){const e=bt(t).map(t=>({x:t.lightener,y:t.target}));if(e.length<2)return[];const{dx:i,tangents:s}=Mt(e);return e.slice(0,-1).map((t,r)=>{const n=e[r+1],o=i[r]/3;return{x0:t.x,x1:n.x,y:[t.y,t.y+s[r]*o,n.y-s[r+1]*o,n.y]}})}function Ut(t,e){if(!t.length)return 0;const i=t.find(t=>e<=t.x1)??t[t.length-1],s=Tt((e-i.x0)/(i.x1-i.x0||1),0,1),r=1-s,[n,o,a,h]=i.y;return Tt(r*r*r*n+3*r*r*s*o+3*r*s*s*a+s*s*s*h,0,100)}const Nt=["","8 4","4 4","12 4 4 4","2 4"],Bt=["circle","square","diamond","triangle","bar"];function zt(t){return 1-Math.pow(1-t,3)}const qt="cubic-bezier(0.33, 1, 0.68, 1)",Wt=["settle","diagonal","ripple","draw_in","watch","grip_hint"],Vt=Object.freeze({settle:!0,diagonal:!0,ripple:!0,draw_in:!0,watch:!0,grip_hint:!0}),jt=Object.freeze({orientation:660,cueFade:330,context:5500}),Kt=500;const Yt="(prefers-reduced-motion: reduce)";function Jt(){return window.matchMedia?.(Yt).matches??!1}function Xt(t){const e=window.matchMedia?.(Yt);if(!e)return()=>{};const i=e=>{e.matches&&t()};return e.addEventListener("change",i),()=>e.removeEventListener("change",i)}function Zt(t,e){return t[e]&&!Jt()}function Qt(t,e,i){const s=performance.now();let r=!0,n=0;const o=a=>{if(!r)return;const h=Math.max(0,a-s);if(h>=t)return r=!1,void i?.();e(h),r&&(n=requestAnimationFrame(o))};return n=requestAnimationFrame(o),()=>{r&&(r=!1,cancelAnimationFrame(n))}}function te(t,e){if(0===e||t<=0||t>=250)return 0;const i=-2*Math.sign(e);if(t<70)return i*zt(t/70);return i*(1-zt((t-70)/180))}const ee=["diag","floor","ceil"],ie={diag:(t,e)=>Math.abs(e-t),floor:(t,e)=>e,ceil:(t,e)=>100-e};function se(t,e,i,s){const r=s=>0===ie[s](e,i)&&("diag"!==s||t>0);return{held:ee.filter(t=>r(t)||s.includes(t)&&ie[t](e,i)<2),landed:ee.find(t=>r(t)&&!s.includes(t))??null}}function re(t){return{points:t,pieces:Ft([...t])}}function ne(t,e,i){return i>=1?e:t+(e-t)*i}function oe(t){return t.length?[...t.map(t=>t.x0),t[t.length-1].x1]:[]}function ae(t,e){const i=(e-t.x0)/(t.x1-t.x0),[s,r,n,o]=t.y,a=ne(s,r,i),h=ne(r,n,i),l=ne(n,o,i),d=ne(a,h,i),c=ne(h,l,i),p=ne(d,c,i);return[{x0:t.x0,x1:e,y:[s,a,d,p]},{x0:e,x1:t.x1,y:[p,c,l,o]}]}function he(t,e){const i=[...new Set([...oe(t),...oe(e)])].sort((t,e)=>t-e),s=t=>{const e=[];for(const s of t){let t=s;for(const s of i){if(s<=t.x0||s>=t.x1)continue;const[i,r]=ae(t,s);e.push(i),t=r}e.push(t)}return e};return[s(t),s(e)]}function le(t,e,i){const s=(t.x1-t.x0)/3,r=[t.x0,t.x0+s,t.x1-s,t.x1];return{x0:t.x0,x1:t.x1,y:t.y.map((t,s)=>ne(t,e.y[s],i(r[s])))}}function de(t,e){return t.points.find(t=>t.lightener===e)?.target??Ut(t.pieces,e)}function ce(t,e){const i=[...new Set([...t.points,...e.points].map(t=>t.lightener))].sort((t,e)=>t-e),[s,r]=he(t.pieces,e.pieces);return{xs:i,from:i.map(e=>de(t,e)),to:i.map(t=>de(e,t)),piecesFrom:s,piecesTo:r}}function pe(t){const e=t.xs.length-1;return e>0?Math.min(20,140/e):0}function ue(t){return 300+pe(t)*(t.xs.length-1)}function _e(t,e){const i=pe(t),s=t.xs.map((t,s)=>zt(Tt((e-s*i)/300,0,1))),r=e=>{const i=t.xs.findIndex(t=>t>=e);if(-1===i)return s[s.length-1];if(0===i)return s[0];const[r,n]=[t.xs[i-1],t.xs[i]];return s[i-1]+(s[i]-s[i-1])*(e-r)/(n-r)};return{points:t.xs.map((e,i)=>({lightener:e,target:ne(t.from[i],t.to[i],s[i])})),pieces:t.piecesFrom.map((e,i)=>le(e,t.piecesTo[i],r))}}function ve(t,e){const i=new Map(e.points.map(t=>[t.lightener,t.target]));return t.map(t=>({lightener:t.lightener,target:i.get(t.lightener)??t.target}))}function ge(t,e,i){const[s,r]=he(t,e);return s.map((t,e)=>le(t,r[e],()=>i))}function me(t){const e={};for(const i of t){const t={};let s=-1,r=0;for(const e of i.controlPoints)Number.isFinite(e.lightener)&&Number.isFinite(e.target)&&(e.lightener<0||e.lightener>100||e.target<0||e.target>100||0===e.lightener&&0===e.target||(t[String(e.lightener)]=String(e.target),e.lightener>s&&(s=e.lightener,r=e.target)));!("100"in t)&&s>=0&&(t[100]=String(r)),e[i.entityId]={brightness:t}}return e}function fe(t,e,i){return Object.keys(t).map((s,r)=>{const n=t[s]?.brightness??{},o=new Map([[0,0]]);for(const[t,e]of Object.entries(n)){const i=Number(t),s=Number(e);Number.isFinite(i)&&Number.isFinite(s)&&(i<0||i>100||s<0||s>100||o.set(i,s))}const a=[...o].map(([t,e])=>({lightener:t,target:e}));a.sort((t,e)=>t.lightener-e.lightener);const h=e[s]?.attributes?.friendly_name??s.replace("light.","");return{entityId:s,friendlyName:h,controlPoints:a,color:i[r%i.length]}})}function ye(t){return{...t,controlPoints:t.controlPoints.map(t=>({...t}))}}function be(t){return t.map(ye)}function we(t,e){if(t.length!==e.length)return!1;for(let i=0;i<t.length;i++){const s=t[i].controlPoints,r=e[i].controlPoints;if(s.length!==r.length)return!1;for(let t=0;t<s.length;t++){if(s[t].lightener!==r[t].lightener)return!1;if(s[t].target!==r[t].target)return!1}}return!0}function xe(t,e){return t.some(t=>t.entityId===e)}function $e(t,e){!function(t,e){t.push(be(e)),t.length>50&&t.shift()}(t,e)}function Ie(t,e,i){const s=()=>i.map(t=>({...t}));return null!==e?t.map(t=>t.entityId===e?{...t,controlPoints:s()}:t):t.map(t=>({...t,controlPoints:s()}))}function ke(t,e,i,s,r){const n=[...t],o=n[e];if(!o||!o.controlPoints[i])return null;const a={...o},h=[...a.controlPoints];return h[i]={lightener:s,target:r},a.controlPoints=h,n[e]=a,n}function Se(t,e,i,s){return function(t,e,i,s){const r=t.findIndex(t=>t.entityId===e);if(r<0)return null;if(t[r].controlPoints.some(t=>t.lightener===i))return null;const n=[...t],o={...n[r]};return o.controlPoints=[...o.controlPoints,{lightener:i,target:s}].sort((t,e)=>t.lightener-e.lightener),n[r]=o,n}(t,e,i,s)}function Ce(t,e,i){return function(t,e,i){const s=t[e];if(!s)return null;if(s.controlPoints.length<=2)return null;if(Rt(s.controlPoints,i))return null;if(!Number.isInteger(i)||i<0||i>=s.controlPoints.length)return null;const r=[...t],n={...r[e]};return n.controlPoints=n.controlPoints.filter((t,e)=>e!==i),r[e]=n,r}(t,e,i)}const Ee=jt.orientation,Pe=new Set,Ae=t=>`lightener:first-use:v1:${t}`;function Te(t,e){Pe.add(t);try{localStorage.setItem(Ae(t),e)}catch{}}function Re(t){return t.length>0&&t.every(t=>t.controlPoints.length>=2&&t.controlPoints.every(t=>t.lightener===t.target))}const Le={presetHighlight:600,presetApply:1200,point:2200,pointGrab:2800,pointUp:3800,pointDown:5400,pointReturn:6800,room:7400,roomGrab:8e3,roomLow:9200,roomHigh:10800,roomReturn:12e3,add:12400,addFirstPress:13e3,addSecondPress:13280,addInsert:13500,remove:14300,removePress:14900,removeDelete:15600,restoreCue:16100,restore:16500,complete:17e3},Me=t=>({...t,controlPoints:t.controlPoints.map(t=>({...t}))});class De{constructor(t){this.changed=t,this.curve=null,this.phase="complete",this.message="complete",this.curveFrame=null,this.presetId="dim_accent",this.cue=null,this.roomPosition=null,this.presetHighlighted=!1,this.frozen=!1,this._cancelFrame=null,this._generation=0}start(t,e,i=100,s="mouse"){this.clear();const r=this._generation,n=Me(t),o=ft.find(t=>"dim_accent"===t.id),a=bt(t.controlPoints),h=bt(o.controlPoints),l=a.length===h.length&&a.every((t,e)=>t.lightener===h[e].lightener&&t.target===h[e].target),d=l?ft.find(t=>"early_starter"===t.id):o;this.presetId=d.id;const c=Ie([n],n.entityId,d.controlPoints)[0],p=c.controlPoints.findIndex(t=>50===t.lightener),u=c.controlPoints[p],_=Math.min(98,u.target+25),v=Math.max(2,u.target-25),g=c.controlPoints[p+1],m=Math.round((u.lightener+g.lightener)/2),f=Gt(c.controlPoints,m),y=Math.round("keyboard"===s?(u.target+g.target)/2:Math.max(2,Math.min(98,f+(f<=50?22:-22)))),b=Se([c],c.entityId,m,y)[0],w=b.controlPoints.findIndex(t=>t.lightener===m),x=Ce([b],0,w)[0],$=Math.max(0,Math.min(100,i??100)),I=e&&!Jt(),k=Le,S=$<=50?100:0,C=100-S,E={preset:ce(re(n.controlPoints),re(c.controlPoints)),add:ce(re(c.controlPoints),re(b.controlPoints)),remove:ce(re(b.controlPoints),re(x.controlPoints)),restore:ce(re(x.controlPoints),re(n.controlPoints))},P=(e,i)=>{if(!I||!this.curve||i<0)return;const s=E[e];if(i>=ue(s))return;const r=_e(s,i);this.curveFrame={entityId:t.entityId,pieces:r.pieces,knots:ve(this.curve.controlPoints,r)}},A=t=>{const e=this.curveFrame?.knots?.find(e=>e.lightener===t);return e?e.target:this.curveFrame?Ut(this.curveFrame.pieces,t):Gt(this.curve.controlPoints,t)},T=(t,e,i,s,r)=>{if(t>=i)return r;if(t<=e||!I)return s;const n=(t-e)/(i-e);return s+(r-s)*(n*n*(3-2*n))};let R="",L=null;const M=e=>{if(r!==this._generation)return;if(this.cue=null,this.curveFrame=null,this.roomPosition=null,this.presetHighlighted=e>=k.presetHighlight&&e<k.restoreCue,this.curve=Me(e<k.presetApply||e>=k.complete?n:c),e>=k.complete)this.phase="complete",this.message="complete";else if(e>=k.restoreCue){this.phase="remove",this.message="restore",this.curve=Me(e<k.restore?x:n),P("restore",e-k.restore);const t=T(e,k.restoreCue,k.restore,m,50);this.cue={lightener:t,target:A(t),pressed:!1}}else if(e>=k.remove)this.phase="remove",this.message="remove",this.curve=Me(e<k.removeDelete?b:x),P("remove",e-k.removeDelete),this.cue={lightener:m,target:A(m),pressed:e>=k.removePress&&e<k.removeDelete,markerOpacity:I?1-zt(Math.max(0,Math.min(1,(e-k.removeDelete+180)/180))):1};else if(e>=k.add){this.phase="add",this.message="add",e>=k.addInsert&&(this.curve=Me(b)),P("add",e-k.addInsert);const t="keyboard"===s&&e<k.addInsert?u.lightener:m,i="keyboard"!==s&&e<k.addInsert&&!this.curveFrame?y:A(t);this.cue={lightener:t,target:i,pressed:e>=k.addFirstPress&&e<k.addFirstPress+140||e>=k.addSecondPress&&e<k.addSecondPress+140,markerOpacity:I&&e>=k.addInsert?zt(Math.min(1,(e-k.addInsert)/150)):1}}else if(e>=k.room)this.phase="room",this.roomPosition=e<k.roomLow?T(e,k.roomGrab,k.roomLow,$,S):e<k.roomHigh?T(e,k.roomLow+300,k.roomHigh,S,C):T(e,k.roomHigh+300,k.roomReturn,C,$),this.message=e<k.roomLow?S>$?"roomBrighter":"roomDimmer":e<k.roomHigh?C>S?"roomBrighter":"roomDimmer":"roomRestore",this.cue={lightener:this.roomPosition,target:8,pressed:I&&e>=k.roomGrab&&e<k.roomReturn};else if(e>=k.point){this.phase="point";const i=e<k.pointUp?T(e,k.pointGrab,k.pointUp,u.target,_):e<k.pointDown?T(e,k.pointUp+400,k.pointDown,_,v):T(e,k.pointDown+400,k.pointReturn,v,u.target);if(this.message=e<k.pointUp?"lightBrighter":e<k.pointDown?"lightDimmer":"lightBrighter",this.curve=ke([c],0,p,u.lightener,Math.round(i))[0],I){const e=ke([c],0,p,u.lightener,i)[0];this.curveFrame={entityId:t.entityId,pieces:re(e.controlPoints).pieces,knots:e.controlPoints}}this.cue={lightener:u.lightener,target:i,labelAbove:u.target<70,pressed:e>=k.pointGrab&&e<k.pointReturn}}else this.phase="preset",this.message="preset",P("preset",e-k.presetApply),this.cue={lightener:50,target:A(50),pressed:!1};const i=JSON.stringify([this.phase,this.message,this.presetHighlighted,this.roomPosition,this.cue,this.curve.controlPoints,this.curveFrame&&[this.curveFrame.pieces,this.curveFrame.knots]]);i===R&&L?this.curve=L:(R=i,L=this.curve,this.changed())};M(0),this._cancelFrame=Qt(k.complete,t=>{I&&Jt()?this.freeze():M(t)},()=>{this._cancelFrame=null,M(k.complete)})}freeze(){this._generation++,this._cancelFrame?.(),this._cancelFrame=null,this.curve&&this.curveFrame?.knots&&(this.curve={...this.curve,controlPoints:this.curve.controlPoints.map((t,e)=>({lightener:t.lightener,target:Math.round(this.curveFrame.knots[e]?.target??t.target)}))}),this.curveFrame=null,this.cue&&(this.cue={...this.cue,pressed:!1}),this.frozen=!0,this.changed()}clear(){this._generation++,this._cancelFrame?.(),this._cancelFrame=null,this.curve=null,this.phase="complete",this.message="complete",this.curveFrame=null,this.cue=null,this.roomPosition=null,this.presetHighlighted=!1,this.frozen=!1,this.changed()}}const Ge="lightener_studio",He="lightener-curve-card",Oe="custom:lightener-curve-card";function Fe(t,e){return"light"===e.split(".")[0]&&t.entities?.[e]?.platform===Ge}function Ue(t,e){customElements.get(t)||customElements.define(t,e)}class Ne{constructor(t,e){this.isConnected=t,this.requestUpdate=e,this.ready=!1,this.started=!1}ensureLoaded(){if(this.started)return;if(this.started=!0,customElements.get("ha-entity-picker"))return void(this.ready=!0);(async()=>{try{const t=window.loadCardHelpers;"function"==typeof t&&await t()}catch{}try{const t=customElements.get("hui-entities-card");await(t?.getConfigElement?.())}catch{}})();const t=customElements.whenDefined("ha-entity-picker"),e=new Promise(t=>setTimeout(t,1500));Promise.race([t,e]).then(()=>{this.isConnected()&&(this.ready=!!customElements.get("ha-entity-picker"),this.ready||(console.warn("[lightener] <ha-entity-picker> not available — falling back to plain input."),customElements.whenDefined("ha-entity-picker").then(()=>{this.isConnected()&&(this.ready=!0,this.requestUpdate())}).catch(()=>{})),this.requestUpdate())}).catch(()=>{})}}function Be(t){return!!t&&"object"==typeof t&&!Array.isArray(t)}function ze(t){return Be(t)&&Object.values(t).every(t=>Be(t)&&(void 0===t.brightness||Be(t.brightness)))}function qe(t,e=!1){return Be(t)&&ze(t.entities)&&"string"==typeof t.config_entry_id&&t.config_entry_id&&"string"==typeof t.revision&&/^v1:[0-9a-f]{64}$/.test(t.revision)&&(e?"saved"===t.status||"unchanged"===t.status:Be(t.capabilities)&&1===t.capabilities.guarded_curve_save)?structuredClone({config_entry_id:t.config_entry_id,revision:t.revision,entities:t.entities}):null}function We(t){return Array.isArray(t)?`[${t.map(We).join(",")}]`:Be(t)?`{${Object.keys(t).sort().map(e=>`${JSON.stringify(e)}:${We(t[e])}`).join(",")}}`:JSON.stringify(t)}function Ve(t,e){return JSON.stringify(Object.keys(t))===JSON.stringify(Object.keys(e))&&We(t)===We(e)}function je(t,e){return t.controlPoints.length===e.controlPoints.length&&t.controlPoints.every((t,i)=>t.lightener===e.controlPoints[i].lightener&&t.target===e.controlPoints[i].target)}function Ke(t,e){const i=new Map(t.map(t=>[t.entityId,t]));return e.filter(t=>{const e=i.get(t.entityId);return!e||!je(e,t)})}function Ye(t,e){const i=structuredClone(t);for(const[t,s]of Object.entries(e))i[t]={...i[t],brightness:{...s.brightness}};return i}function Je(t,e,i){const s=new Map(t.map(t=>[t.entityId,t])),r=new Map(i.map(t=>[t.entityId,t]));return Ke(t,e).map(t=>{const e=r.get(t.entityId);return{entityId:t.entityId,friendlyName:t.friendlyName,local:t,kind:e?je(e,t)?"already-saved":s.has(t.entityId)&&je(e,s.get(t.entityId))?"unchanged":"conflicting":"removed"}})}class Xe extends ct{constructor(){super(...arguments),this._choices={},this._acknowledged=!1,this._mountGeneration=0,this._finished=!1}_onDialogKeydown(t){(t.ctrlKey||t.metaKey)&&"s"===t.key.toLowerCase()?(t.preventDefault(),t.stopPropagation()):"Escape"===t.key&&t.stopPropagation()}connectedCallback(){super.connectedCallback();const t=++this._mountGeneration;this._finished=!1,this.updateComplete.then(()=>{this.isConnected&&t===this._mountGeneration&&!this._finished&&this._openDialog()})}willUpdate(t){t.has("review")&&(this._choices={},this._acknowledged=!1,this._finished=!1)}updated(t){t.has("review")&&this._openDialog()}_openDialog(){if(!this.isConnected||this._finished)return;const t=this.renderRoot.querySelector("dialog");t&&!t.open&&(t.showModal(),this.renderRoot.querySelector("h2")?.focus())}disconnectedCallback(){this._mountGeneration++,this._finished=!0,this.renderRoot.querySelector("dialog")?.close(),super.disconnectedCallback()}_finish(t){this._finished||(this._finished=!0,this.renderRoot.querySelector("dialog")?.close(),this.dispatchEvent(t))}_close(){this._finish(new CustomEvent("review-dismiss"))}_accept(t){const e=new Set(this.review.members.filter(t=>"unchanged"===t.kind||!0===this._choices[t.entityId]).map(t=>t.entityId));this._finish(new CustomEvent("review-accept",{detail:{keep:t?new Set:e}}))}render(){if(!this.review)return W``;const t=this.review.members.some(t=>"removed"===t.kind),e=this.review.members.every(t=>"conflicting"!==t.kind||t.entityId in this._choices);return W`<dialog
      aria-labelledby="review-title"
      @keydown=${this._onDialogKeydown}
      @cancel=${t=>{t.preventDefault(),this._close()}}
    >
      <h2 id="review-title" tabindex="-1">${mt.saveReview.title}</h2>
      <p>${mt.saveReview.body}</p>
      ${this.review.members.map(t=>W`<div class="member">
            <strong>${t.friendlyName}</strong>
            ${"conflicting"===t.kind?W`<div class="choices">
                  ${[!0,!1].map(e=>W`<label
                        ><input
                          type="radio"
                          name=${t.entityId}
                          .checked=${this._choices[t.entityId]===e}
                          @change=${()=>{this._choices={...this._choices,[t.entityId]:e}}}
                        />${e?mt.saveReview.keep:mt.saveReview.saved}</label
                      >`)}
                </div>`:W`<p>
                  ${"removed"===t.kind?mt.saveReview.removed:"already-saved"===t.kind?mt.saveReview.alreadySaved:mt.saveReview.unchanged}
                </p>`}
          </div>`)}
      ${t?W`<label
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
    </dialog>`}}Xe.styles=a`
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
  `,t([vt({attribute:!1})],Xe.prototype,"review",void 0),t([gt()],Xe.prototype,"_choices",void 0),t([gt()],Xe.prototype,"_acknowledged",void 0),Ue("save-conflict-review",Xe);const Ze={records:32,recordBytes:4194304,totalBytes:16777216};function Qe(t){return t.map(t=>({entityId:t.entityId,points:t.controlPoints.map(t=>({lightener:t.lightener,target:t.target}))}))}function ti(t,e){return JSON.stringify(t)===JSON.stringify(e)}function ei(t){if(!Array.isArray(t))return null;const e=new Set,i=[];for(const s of t){if(!s||"string"!=typeof s.entityId||!s.entityId||e.has(s.entityId)||!Array.isArray(s.points))return null;e.add(s.entityId);const t=[];for(const e of s.points){if(!e||!Number.isFinite(e.lightener)||!Number.isFinite(e.target)||e.lightener<0||e.lightener>100||e.target<0||e.target>100)return null;t.push({lightener:e.lightener,target:e.target})}i.push({entityId:s.entityId,points:t})}return i}function ii(t){if(!t||1!==t.schema||"string"!=typeof t.entityId||!t.entityId||!(null===t.baselineRevision||"string"==typeof t.baselineRevision&&/^v1:[0-9a-f]{64}$/.test(t.baselineRevision))||!["ordinary","conflict","unknown","reread","runtime","unsupported"].includes(t.outcome)||!Array.isArray(t.undo)||t.undo.length>50)return null;const e=ei(t.baseline),i=ei(t.local),s=Array.from(t.undo,ei);return e&&i&&!s.some(t=>!t)?{schema:1,entityId:t.entityId,baselineRevision:t.baselineRevision,baseline:e,local:i,undo:s,outcome:t.outcome}:null}const si=t=>JSON.stringify([t.origin,t.userId,t.authEpoch,t.configEntryId,t.surface]),ri=(t,e)=>JSON.stringify([t.origin,t.userId,t.authEpoch,e]);const ni=new class{constructor(t=Ze){this._limits=t,this._principals=new Map,this._epoch=0,this._records=new Map,this._subscribers=new Map,this._barriers=new Set,this._writes=new Map,this._writeGenerations=new Map}activatePrincipal(t,e){if("string"!=typeof t||!t||"string"!=typeof e||!e.trim())throw new Error("Authenticated identity required");const i=this._principals.get(t);if(i?.userId===e)return{...i};if(i){this._principals.delete(t);for(const[e,i]of this._records)i.scope.origin===t&&this._records.delete(e);for(const e of this._barriers)JSON.parse(e)[0]===t&&this._barriers.delete(e);for(const e of this._writeGenerations.keys())JSON.parse(e)[0]===t&&this._writeGenerations.delete(e);for(const e of this._writes.keys())JSON.parse(e)[0]===t&&this._writes.delete(e);for(const[e,i]of this._subscribers)if(JSON.parse(e)[0]===t){for(const t of i)t();this._subscribers.delete(e)}}const s={origin:t,userId:e,authEpoch:++this._epoch};return this._principals.set(t,s),{...s}}isCurrent(t){const e=this._principals.get(t.origin);return!!e&&e.userId===t.userId&&e.authEpoch===t.authEpoch}_validScope(t){return this.isCurrent(t)&&"string"==typeof t.configEntryId&&!!t.configEntryId&&["sidebar","dashboard"].includes(t.surface)}_notify(t){for(const e of this._subscribers.get(si(t))??[])e()}_notifyGroup(t,e){for(const i of["sidebar","dashboard"])this._notify({...t,configEntryId:e,surface:i})}_matches(t,e){return this._validScope(t)&&!!e&&si(t)===si(e.scope)}_owned(t,e){const i=this._records.get(e.draftId);return this._matches(t,i)&&i.ownerId===e.ownerId&&i.claimEpoch===e.claimEpoch&&i.version===e.version?i:void 0}owns(t,e){return!!this._owned(t,e)}_claim(t){return{draftId:t.draftId,ownerId:t.ownerId,claimEpoch:t.claimEpoch,version:t.version}}_size(t,e){return(new TextEncoder).encode(JSON.stringify({scope:t,payload:e})).byteLength}_fits(t,e=0){let i=t-e;for(const t of this._records.values())i+=t.bytes;return t<=this._limits.recordBytes&&i<=this._limits.totalBytes}create(t,e,i){const s=ii(i);if(!this._validScope(t)||"string"!=typeof e||!e||!s||ti(s.baseline,s.local))return{ok:!1,reason:"invalid"};const r={origin:t.origin,userId:t.userId,authEpoch:t.authEpoch,configEntryId:t.configEntryId,surface:t.surface},n=this._size(r,s);if(this._records.size>=this._limits.records||!this._fits(n))return{ok:!1,reason:"capacity"};const o={scope:r,payload:s,draftId:crypto.randomUUID(),ownerId:e,claimEpoch:1,version:1,createdAt:Date.now(),updatedAt:Date.now(),complete:!0,bytes:n};this._records.set(o.draftId,o);const a=this._claim(o);return this._notify(t),{ok:!0,value:a}}update(t,e,i){const s=this._owned(t,e);if(!s)return{ok:!1,reason:"stale"};const r=ii(i),n=r?this._size(s.scope,r):1/0;if(!r||!this._fits(n,s.bytes)){s.complete=!1,s.version++;const e=this._claim(s);return this._notify(t),{ok:!1,reason:r?"capacity":"invalid",claim:e}}s.payload=r,s.bytes=n,s.complete=!0,s.version++,s.updatedAt=Date.now();const o=this._claim(s);return this._notify(t),{ok:!0,value:o}}list(t){return this._validScope(t)?[...this._records.values()].filter(e=>this._matches(t,e)&&!e.ownerId).map(t=>({draftId:t.draftId,version:t.version,updatedAt:t.updatedAt,complete:t.complete,affectedIds:t.payload.local.filter(e=>!ti([e],t.payload.baseline.filter(t=>t.entityId===e.entityId))).map(t=>t.entityId)})):[]}claim(t,e,i,s){const r=this._records.get(e);if(!this._matches(t,r)||"string"!=typeof s||!s||r.version!==i)return{ok:!1,reason:"stale"};if(r.ownerId)return{ok:!1,reason:"busy"};r.ownerId=s,r.claimEpoch++;const n={claim:this._claim(r),payload:structuredClone(r.payload)};return this._notify(t),{ok:!0,value:n}}release(t,e){const i=this._owned(t,e);if(!i)return null;i.ownerId=null;const s={draftId:i.draftId,ownerId:e.ownerId,releasedEpoch:i.claimEpoch,version:i.version};return this._notify(t),s}resume(t,e){const i=this._records.get(e.draftId);if(!this._matches(t,i)||i.ownerId||i.claimEpoch!==e.releasedEpoch||i.version!==e.version)return{ok:!1,reason:"lost"};i.ownerId=e.ownerId,i.claimEpoch++;const s={claim:this._claim(i),payload:structuredClone(i.payload)};return this._notify(t),{ok:!0,value:s}}clear(t,e){const i=this._owned(t,e);return!!i&&(this._records.delete(i.draftId),this._notify(t),!0)}subscribe(t,e){if(!this._validScope(t))return()=>{};const i=si(t),s=this._subscribers.get(i)??new Set;return s.add(e),this._subscribers.set(i,s),()=>{s.delete(e),s.size||this._subscribers.delete(i)}}markRuntimeBlocked(t,e){this.isCurrent(t)&&"string"==typeof e&&e&&(this._barriers.add(ri(t,e)),this._notifyGroup(t,e))}isRuntimeBlocked(t,e){return this.isCurrent(t)&&this._barriers.has(ri(t,e))}beginWrite(t,e,i){if(!this.isCurrent(t)||"string"!=typeof e||!e||"string"!=typeof i||!i)return;const s=ri(t,e),r=this._writes.get(s)??new Map;r.has(i)||(this._writeGenerations.set(s,(this._writeGenerations.get(s)??0)+1),r.set(i,"pending"),this._writes.set(s,r),this._notifyGroup(t,e))}settleWrite(t,e,i,s){if(!this.isCurrent(t))return;const r=this._writes.get(ri(t,e));if(r?.has(i)){if("runtime"===s&&this.markRuntimeBlocked(t,e),"unknown"===s||"runtime"===s){if("pending"===r.get(i)){const i=ri(t,e);this._writeGenerations.set(i,(this._writeGenerations.get(i)??0)+1)}r.set(i,"unknown")}else r.delete(i);r.size||this._writes.delete(ri(t,e)),this._notifyGroup(t,e)}}writeGeneration(t,e){return this.isCurrent(t)?this._writeGenerations.get(ri(t,e))??0:0}hasUnknownWrite(t,e){return this.isCurrent(t)&&[...this._writes.get(ri(t,e))?.values()??[]].includes("unknown")}hasUnresolvedWrite(t,e){return this.isCurrent(t)&&!!this._writes.get(ri(t,e))?.size}};function oi(t,e){const i=t?.states[e];if("off"===i?.state)return"off";if("on"!==i?.state)return null;const s=i.attributes.brightness;return void 0===s?"on":Number.isFinite(s)&&s>=0&&s<=255?s:null}function ai(t){const e=t?.user?.id?.trim();return e?`${location.origin}/${e}`:null}function hi(t){return!!t&&!!ai(t)&&t.user.is_admin&&!1!==t.connected&&!1!==t.connection?.connected}const li=new class{constructor(){this._serial=0,this._sessions=new Map,this._reservations=new Map,this._mutations=new Map,this._listeners=new Set,this._deferred=new Map}subscribe(t){return this._listeners.add(t),()=>this._listeners.delete(t)}_notify(){for(const t of this._listeners)t()}list(t,e){return[...this._sessions.values()].filter(i=>i.principal===t&&i.group===e)}create(t,e,i=e){const s={id:++this._serial,principal:t,group:e,entry:i,phase:"watching",lights:new Map};return this._sessions.set(s.id,s),s}reserve(t,e){if(this._mutations.has(t.group))return!1;if(e.some(e=>this._reservations.has(e)&&this._reservations.get(e)!==t.id))return!1;for(const i of e)this._reservations.set(i,t.id);return!0}beginMutation(t,e){if(this._mutations.has(t)||e.some(t=>this._reservations.has(t)))return null;const i=`mutation:${crypto.randomUUID()}`;this._mutations.set(t,i);for(const t of e)this._reservations.set(t,i);return this._notify(),()=>{if(this._mutations.get(t)===i){this._mutations.delete(t);for(const t of e)this._reservations.get(t)===i&&this._reservations.delete(t);this._notify()}}}mutationBlocked(t){return this._mutations.has(t)}_issue(t,e,i,s,r){e.inFlight=!0;let n=!1;const o=()=>{if(!n){if(n=!0,clearTimeout(a),e.inFlight=!1,!r&&e.restoreAfter){e.restoreAfter=!1;const i=this._deferred.get(t.id)?.resolve();if(i)return void this._issue(t,e,e.before,i,!0)}this._settle(t)}},a=setTimeout(o,1e4);(function(t,e,i){try{return Promise.resolve(t.callService("light","off"===i?"turn_off":"turn_on",{entity_id:e,..."number"==typeof i?{brightness:i}:{},transition:.25},void 0,!1))}catch(t){return Promise.reject(t)}})(s,e.entityId,i).then(o,e=>{r||"done"===t.phase||null===e||"object"!=typeof e||"unauthorized"!==e.code||(t.phase="restoring",this.abandon(t)),o()})}preview(t,e,i,s){"watching"!==t.phase||e.inFlight||this._issue(t,e,i,s,!1)}finish(t,e,i=()=>e){if("watching"===t.phase){if(t.phase="restoring",e){if([...t.lights.values()].filter(t=>t.inFlight).length){const s=e.connection,r=()=>{s?.removeEventListener("disconnected",n),this._deferred.delete(t.id)},n=()=>this.abandon(t);s?.addEventListener("disconnected",n),this._deferred.set(t.id,{resolve:i,dispose:r})}for(const i of t.lights.values())i.inFlight?i.restoreAfter=!0:this._issue(t,i,i.before,e,!0)}this._settle(t)}}abandon(t){for(const e of t.lights.values())e.restoreAfter=!1;this._settle(t)}_settle(t){if("restoring"!==t.phase||[...t.lights.values()].some(t=>t.inFlight)||(t.phase="done",this._sessions.delete(t.id)),"done"!==t.phase&&[...t.lights.values()].some(t=>t.restoreAfter)||this._deferred.get(t.id)?.dispose(),"watching"!==t.phase)for(const[e,i]of this._reservations)i!==t.id||"done"!==t.phase&&t.lights.get(e)?.inFlight||this._reservations.delete(e);this._notify()}};class di{constructor(t,e=300,i=li){this._host=t,this._intervalMs=e,this._registry=i,this._active=!1,this._rafPending=!1,this._trailingTimer=null,this._session=null,this._unsubscribe=null,this._restoring=new Set,this._onConnectionLost=()=>this._lose(),this._queued=new Map,this.admissionIssue=null,this._lastBrightness=new Map,this._frameGeneration=0,this._pending=null,this.lastPreviewTime=0}get active(){return this._active}get sessions(){const t=ai(this._host.getHass()),e=this._host.getStorageEntityId();return t&&e?this._registry.list(t,e):[]}get otherWatching(){return this.sessions.some(t=>"watching"===t.phase&&t!==this._session)}get mutationBlocked(){return this._registry.mutationBlocked(this._host.getStorageEntityId()??"")}get blocked(){return this.sessions.length>0||this.mutationBlocked}connect(){this.observe(),this._unsubscribe??=this._registry.subscribe(()=>{this._session&&"watching"!==this._session.phase&&this._end(!1),this._pruneRestoring(),this._sendQueued(),this._host.restorationChanged?.()})}observe(){this._pruneRestoring();const t=this._host.getHass();this._connection!==t?.connection&&(this._connection&&this._lose(),this._connection?.removeEventListener("disconnected",this._onConnectionLost),this._connection=t?.connection,this._connection?.addEventListener("disconnected",this._onConnectionLost)),this._session&&!this._authorized(this._session)&&this._end(!1);for(const t of[...this._restoring])this._restoreHass(this._connection,t)||(this._restoring.delete(t),this._registry.abandon(t))}_lose(){this._end(!1),this._abandonRestoring()}_pruneRestoring(){for(const t of this._restoring)"done"===t.phase&&this._restoring.delete(t)}_abandonRestoring(){const t=[...this._restoring];this._restoring.clear();for(const e of t)this._registry.abandon(e)}_restoreHass(t,e){const i=this._host.getHass();return hi(i)&&i.connection===t?this._host.restoreBlocked?.(e.entry,e.principal)?null:ai(i)===e.principal?i:null:null}_authorized(t){const e=this._host.getHass();return hi(e)&&ai(e)===t.principal&&this._host.getStorageEntityId()===t.group&&(this._host.getConfigEntryId?.()??t.group)===t.entry&&(this._host.canDispatch?.()??!0)}start(){this.connect();const t=this._host.getHass(),e=this._host.getStorageEntityId();hi(t)&&e&&!this._active&&!this.blocked&&(this._host.canDispatch?.()??1)&&(this.admissionIssue=null,this._session=this._registry.create(ai(t),e,this._host.getConfigEntryId?.()??e),this._active=!0,this._host.setPreviewActive(!0),null===this._host.getScrubberPosition()&&(this._host.setScrubberPosition(50),this._host.persistScrubberPosition(e,50)),this._lastBrightness.clear(),this.refresh(!0))}_fence(){this._active=!1,this._host.setPreviewActive(!1),this._rafPending=!1,this._frameGeneration++,this._pending=null,this._queued.clear(),this._clearTrailingTimer()}_end(t){this._fence();const e=this._session;if(this._session=null,!e)return null;const i=this._host.getHass(),s=i?.connection;return this._registry.finish(e,t&&!this._host.restoreBlocked?.(e.entry,e.principal)&&hi(i)&&ai(i)===e.principal?i:null,()=>this._restoreHass(s,e)),"done"===e.phase?null:(this._pruneRestoring(),this._restoring.add(e),e)}stop(t=!0){const e=this._end(t);return e?new Promise(t=>{const i=this._registry.subscribe(()=>{"done"===e.phase&&(i(),t(!this.blocked))})}):Promise.resolve(!this.blocked)}disconnect(t=!0){this._end(t),t||this._abandonRestoring(),this._unsubscribe?.(),this._unsubscribe=null,this._connection?.removeEventListener("disconnected",this._onConnectionLost),this._connection=void 0}_sendQueued(){const t=this._session;if(!t||!this._active||0===this._queued.size)return;const e=this._host.getHass();if(e&&this._authorized(t))for(const[i,s]of[...this._queued]){if(t.lights.get(i)?.inFlight)continue;this._queued.delete(i);const r=this._host.getCurves().find(t=>t.entityId===i);r&&this._pushCurve(e,r,s.position,s.value)}}beginMutation(t){const e=this._host.getStorageEntityId(),i=this._host.getHass();return e&&hi(i)&&(this._host.canDispatch?.()??1)&&!this.blocked?this._registry.beginMutation(e,[...new Set([...this._host.getCurves().map(t=>t.entityId),...t])]):null}refresh(t=!1){this._active&&(null===this._host.getScrubberPosition()&&this._host.setScrubberPosition(50),this.previewLights(this._host.getScrubberPosition()??50,t))}previewLights(t,e=!1){this._schedule({position:t,entityId:null},e)}previewSingleLight(t,e,i=!1,s){this._schedule({position:e,entityId:t,value:s},i)}_schedule(t,e){const i=this._host.getHass();if(!this._active||!i)return;this._pending=t,e&&(this.lastPreviewTime=0,this._rafPending=!1,this._frameGeneration++,null===t.entityId?this._lastBrightness.clear():this._lastBrightness.delete(t.entityId),this._clearTrailingTimer());const s=Date.now()-this.lastPreviewTime;if(s<this._intervalMs)return void(this._trailingTimer||(this._trailingTimer=setTimeout(()=>{this._trailingTimer=null,null!==this._pending&&this._schedule(this._pending,!1)},this._intervalMs-s)));if(this._rafPending)return;this._clearTrailingTimer(),this._rafPending=!0;const r=this._frameGeneration;requestAnimationFrame(()=>{if(r!==this._frameGeneration)return;this._rafPending=!1;const e=this._host.getHass();if(!this._active||!e)return;this.lastPreviewTime=Date.now();const i=this._pending??t,s=this._session;if(!s||!this._authorized(s))return this._end(!1),void this.observe();const n=this._host.getCurves().filter(t=>(null===i.entityId||t.entityId===i.entityId)&&null!==oi(e,t.entityId));if(!this._registry.reserve(s,n.map(t=>t.entityId)))return this.admissionIssue=mt.restoration.overlap,this._end(!0),void this._host.restorationChanged?.();if(null===i.entityId)for(const t of this._host.getCurves())this._pushCurve(e,t,i.position);else{const t=this._host.getCurves().find(t=>t.entityId===i.entityId);t&&this._pushCurve(e,t,i.position,i.value)}})}_pushCurve(t,e,i,s){const r=this._session,n=oi(t,e.entityId);if(!(r&&this._active&&this._authorized(r)&&null!==n&&this._host.getCurves().some(t=>t.entityId===e.entityId)))return;let o=r.lights.get(e.entityId);if(o?.inFlight)return void this._queued.set(e.entityId,{position:i,value:s});const a=Math.max(0,Math.min(100,s??Dt(e.controlPoints,i))),h=Math.round(a/100*255),l=0===h?"off":h;this._lastBrightness.get(e.entityId)!==l&&(o||(o={entityId:e.entityId,before:n,inFlight:!1,restoreAfter:!1},r.lights.set(e.entityId,o)),this._lastBrightness.set(e.entityId,l),this._registry.preview(r,o,l,t))}_clearTrailingTimer(){this._trailingTimer&&(clearTimeout(this._trailingTimer),this._trailingTimer=null)}}const ci=["dim_accent","late_starter","early_starter"];class pi{constructor(t){this._host=t,this._phase="inactive",this._firstRun=!1,this._shimmerStarted=!1,this._shimmerActive=!1,this._shimmerTimer=null,this._target=null,this._onInteraction=t=>{t.isTrusted&&this.interrupt()},this._onVisibilityChange=()=>{"visible"!==document.visibilityState?this.stopShimmer():this.maybeStartShimmer()}}get phase(){return this._phase}configure(t,e){const i=this._firstRun;this._firstRun=t,e?(this.stopShimmer(),this._shimmerStarted=!1,this._setPhase(t?"choose_shape":"inactive")):t&&!i&&"inactive"===this._phase&&(this._setPhase("choose_shape"),this._shimmerStarted=!1,this.maybeStartShimmer())}connect(t){this._target!==t&&(this._target&&this.disconnect(),this._target=t,t.addEventListener("pointerdown",this._onInteraction,!0),t.addEventListener("keydown",this._onInteraction,!0),t.addEventListener("focusin",this._onInteraction,!0),document.addEventListener("visibilitychange",this._onVisibilityChange))}disconnect(){this.stopShimmer(),this._target&&(this._target.removeEventListener("pointerdown",this._onInteraction,!0),this._target.removeEventListener("keydown",this._onInteraction,!0),this._target.removeEventListener("focusin",this._onInteraction,!0),document.removeEventListener("visibilitychange",this._onVisibilityChange),this._target=null)}maybeStartShimmer(){if(!this._target||!this._firstRun||this._shimmerStarted||"choose_shape"!==this._phase||!this._host.isReady()||"visible"!==document.visibilityState||Jt())return;const t=ci.map(t=>ft.find(e=>e.id===t)).filter(t=>void 0!==t);if(0===t.length)return;this._shimmerStarted=!0,this._shimmerActive=!0;let e=0;const i=()=>{if(this._shimmerActive){if(e>=t.length)return this._shimmerActive=!1,this._shimmerTimer=null,void this._host.clearTrial();this._host.setTrial(t[e++]),this._shimmerTimer=window.setTimeout(i,1350)}};i()}stopShimmer(){null!==this._shimmerTimer&&(window.clearTimeout(this._shimmerTimer),this._shimmerTimer=null),this._shimmerActive&&(this._shimmerActive=!1,this._host.clearTrial())}interrupt(){this._shimmerStarted=!0,this.stopShimmer()}toggle(t){"inactive"!==this._phase?this.dismiss():this._setPhase(t?"ready_to_save":"choose_shape")}dismiss(){this.stopShimmer(),this._setPhase("inactive")}afterEdit(){this.stopShimmer(),"inactive"!==this._phase&&this._setPhase("ready_to_save")}afterClean(){"ready_to_save"===this._phase&&this._setPhase("choose_shape")}afterSave(){"ready_to_save"===this._phase&&(this.stopShimmer(),this._setPhase("complete"))}_setPhase(t){this._phase!==t&&(this._phase=t,this._host.requestUpdate())}}const ui=a`(max-width: ${o(500)}px)`,_i=a`
  @property --curve-graph-max-height {
    syntax: '<length-percentage>';
    inherits: true;
    initial-value: ${520}px;
  }
  :host {
    --card-bg: var(--ha-card-background, var(--card-background-color, #fff));
    --text-color: var(--primary-text-color, #212121);
    --secondary-text: var(--secondary-text-color, #616161);
    --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    --accent: var(--primary-color, #2563eb);
    /* Warm marks real light in the room while Watch is on; blue stays for data. */
    --watch-warm: #ffb300;
    /* Three tiers: the sheet (--card-bg), the graph's well and the Edit header bed.
       These recipes darken a light theme and lighten a dark one on their own. */
    --graph-panel: color-mix(in srgb, var(--text-color) 5%, var(--card-bg));
    --watch-well: color-mix(in srgb, var(--graph-panel) 96%, var(--watch-warm) 4%);
    --edit-bed: color-mix(in srgb, var(--text-color) 8%, var(--card-bg));
    /* The Room dim overlay and the plot paint with this, so they match the well. */
    --graph-bg: var(--graph-panel);
    --panel-bg: color-mix(in srgb, var(--card-bg) 95%, var(--secondary-text, #616161) 5%);
    --text-xs: 9px;
    --text-sm: 12px;
    --text-md: 13px;
    --text-lg: 14px;
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
    /* The ⋮ menu opens over the graph but stays below fixed HA chrome. */
    position: relative;
    z-index: 1;
    /* Same footprint in View and Edit: the bed only paints, it never resizes. */
    margin-inline: -8px;
    padding-inline: 8px;
    box-shadow: inset 0 -2px 0 transparent;
    transition:
      background-color 150ms ease,
      box-shadow 150ms ease;
  }
  /* Edit is the header bed plus its blue rule (the exit slot also changes). */
  :host([data-mode='edit']) .header {
    background-color: var(--edit-bed);
    box-shadow: inset 0 -2px 0 #2563eb;
  }
  .header > h2 {
    flex: 1 1 160px;
  }
  .header > .editor-toolbar {
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
    /* The graph spans the card; past its height cap the plot widens instead
         of letterboxing. The plot transform sets the Room bar's insets. */
    width: 100%;
    gap: 4px;
  }
  .side-rail {
    gap: 10px;
  }
  .graph-panel {
    container: lightener-graph-panel / inline-size;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--_graph-panel-padding);
    background-color: var(--graph-bg);
    border-radius: 12px;
    /* A ring rather than a border, so the plot never shifts. */
    box-shadow: 0 0 0 1px var(--divider);
    transition:
      background-color 150ms ease,
      box-shadow 150ms ease;
  }
  /* Watch room react: the well warms a little and takes a warm frame. */
  .card.watching {
    --graph-bg: var(--watch-well);
  }
  .card.watching .graph-panel {
    box-shadow: 0 0 0 1px var(--watch-warm);
  }
  .control-slot {
    min-width: 0;
  }
  .control-dock {
    width: 100%;
  }
  /* The Room grip tucks under the graph's tick labels, close to its edge,
     including the padding a grown plot leaves under its native-size labels. */
  .room-surface {
    position: relative;
    margin-top: calc(-12px - var(--graph-pad-trim, 0px));
    padding: 0 0 14px;
  }
  /* The Watch note hangs under Room on narrow cards, over the list. */
  .room-surface > .watch-hint.snackbar {
    top: calc(100% + 8px);
  }
  /* Edit: the selected light's chips, with Undo at the right end. */
  .edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0 0 10px;
  }
  .edit-row:focus,
  .message-line:focus {
    outline: none;
  }
  .edit-row > .shape-chip-bar {
    flex: 0 1 300px;
  }
  .edit-row > curve-footer {
    flex: 0 0 auto;
    margin-left: auto;
  }
  /* One line of guidance or a message that needs an action, only while it exists. */
  .message-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    min-width: 0;
    padding: 0 0 10px;
    color: var(--secondary-text);
    font-size: var(--text-sm);
    line-height: 1.4;
  }
  .message-line > * {
    flex: 1 1 auto;
    min-width: 0;
  }
  .canvas-guidance-text {
    color: var(--secondary-text);
  }
  .room-surface:empty {
    display: none;
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
    animation: invitation-appear ${jt.cueFade}ms ease-out both;
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
  .card.embedded .header {
    margin-bottom: 12px;
    margin-inline: 0;
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
  /* The graph, Room brightness and the rows under it sit on top at every width,
       with the light list underneath. The narrow rules are container queries
       on the card's own width, so the Lovelace card and the sidebar panel
       match at the same size. */
  .side-rail {
    padding-top: 16px;
    border-top: 1px solid var(--divider);
  }
  @container lightener-card (max-width: 859.98px) {
    .graph-panel {
      gap: 8px;
    }
  }
  /* Tips take the message line: a title and up to two short lines. */
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
  @container lightener-card-shell ${ui} {
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
    .header,
    .graph-panel {
      transition: none;
    }
  }
`,vi=a`
  .preview-toggle-btn {
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    min-height: 32px;
    padding: 5px 6px 5px 12px;
    border-radius: 999px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: transparent;
    color: var(--secondary-text, var(--secondary-text-color, #616161));
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition:
      background 150ms ease-out,
      border-color 150ms ease-out;
  }
  .preview-toggle-btn.active {
    color: var(--primary-text-color, #212121);
    border-color: color-mix(in srgb, var(--watch-warm, #ffb300) 70%, transparent);
    background: color-mix(in srgb, var(--watch-warm, #ffb300) 16%, transparent);
  }
  .preview-toggle-btn:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  .preview-toggle-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .preview-track {
    position: relative;
    flex: 0 0 auto;
    box-sizing: border-box;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid currentColor;
    opacity: 0.85;
    transition:
      background 150ms ease-out,
      border-color 150ms ease-out;
  }
  .preview-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: currentColor;
    transition: transform 150ms ease-out;
  }
  .preview-toggle-btn.active .preview-track {
    background: var(--watch-warm, #ffb300);
    border-color: var(--watch-warm, #ffb300);
    opacity: 1;
  }
  .preview-toggle-btn.active .preview-knob {
    transform: translateX(16px);
    background: var(--card-background-color, #fff);
  }
  .watch-anchor {
    position: relative;
    display: inline-flex;
    min-width: 0;
  }
  /* Hangs under the header switch so showing or dismissing it never moves the layout. */
  .watch-hint {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    z-index: 3;
    box-sizing: border-box;
    width: max-content;
    max-width: min(340px, 80vw);
    padding: 14px 16px 12px;
    border-radius: 16px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: var(--card-background-color, #fff);
    color: var(--secondary-text-color, #616161);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    font-size: 13px;
    line-height: 1.45;
    text-align: left;
  }
  /* On phones the note is a snackbar under Room, on an inverse surface. */
  .watch-hint.snackbar {
    left: 0;
    right: 0;
    width: auto;
    max-width: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 8px 10px 16px;
    border: 0;
    background: var(--primary-text-color, #212121);
    color: color-mix(in srgb, var(--card-background-color, #fff) 82%, transparent);
  }
  .watch-hint.snackbar .watch-hint-actions {
    margin: 0 0 0 auto;
  }
  .watch-hint.snackbar .watch-hint-dismiss {
    border: 0;
    color: var(--card-background-color, #fff);
  }
  .watch-hint-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .watch-hint-dismiss {
    font: inherit;
    font-weight: 500;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
  }
  @media (prefers-reduced-motion: reduce) {
    .preview-toggle-btn,
    .preview-track,
    .preview-knob {
      transition: none;
    }
  }
  @media ${ui} {
    .preview-toggle-btn {
      min-height: 44px;
    }
  }
`,gi="lightener:watch-hint:v1";let mi=!1;function fi(t,e,i){return W`<button
    type="button"
    role="switch"
    class="preview-toggle-btn ${t?"active":""}"
    aria-checked=${t?"true":"false"}
    aria-description=${mt.scrubber.watchGuidance}
    ?disabled=${e}
    @click=${i}
  >
    <span class="preview-label">${mt.scrubber.watchButton}</span
    ><span class="preview-track" aria-hidden="true"><span class="preview-knob"></span></span>
  </button>`}function yi(t,e=!1){return W`<div class="watch-hint ${e?"snackbar":""}" role="note">
    <span>${mt.scrubber.watchHintBody}</span>
    <div class="watch-hint-actions">
      <button type="button" class="watch-hint-dismiss" @click=${t}>
        ${mt.scrubber.watchHintDismiss}
      </button>
    </div>
  </div>`}const bi=a`
  ${vi}
  /*
   * Chips, Watch and Undo sit under Room. Undo's header copy takes over from a
   * 640px shell (the panel's lightener-shell container); the chips' and Watch's
   * from 1100px. Dashboard cards have no such container, so exactly one of each
   * shows at any width.
   */
  .editor-toolbar .watch-anchor,
  .editor-toolbar .header-chips,
  .editor-toolbar .header-undo {
    display: none;
  }
  @container lightener-shell (min-width: 640px) {
    .editor-toolbar .header-undo {
      display: flex;
      align-items: center;
    }
    .card.hosted .edit-row > curve-footer,
    .card.hosted .edit-row:not(:has(.shape-chip-bar)) {
      display: none;
    }
  }
  @container lightener-shell (min-width: 1100px) {
    .editor-toolbar .watch-anchor {
      display: inline-flex;
    }
    .editor-toolbar .header-chips {
      display: flex;
      align-items: center;
    }
    .card.hosted .watch-under-room,
    .card.hosted .edit-row {
      display: none;
    }
  }
  /* View keeps Undo's place in the header, so Watch never moves. */
  .editor-toolbar .header-undo[data-reserved] {
    visibility: hidden;
  }
  .editor-toolbar .header-chips:empty {
    display: none;
  }
  /* Shape chips: a tiny signature of the shape and its short name. */
  .shape-chip-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    min-width: 0;
    width: 100%;
  }
  .editor-toolbar .shape-chip-bar {
    grid-template-columns: repeat(4, 64px);
    width: auto;
  }
  .shape-chip {
    --_chip-accent: var(--accent, var(--primary-color, #2563eb));
    --_chip-divider: var(--divider, var(--divider-color, rgba(127, 127, 127, 0.2)));
    display: grid;
    grid-template-rows: 12px auto;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 44px;
    padding: 6px 6px 5px;
    border: 1px solid var(--_chip-divider);
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
    font: inherit;
    transition:
      border-color 0.15s ease,
      background 0.15s ease,
      box-shadow 0.15s ease;
  }
  .editor-toolbar .shape-chip {
    min-height: 36px;
    padding: 4px 6px 3px;
  }
  .shape-chip:hover {
    border-color: var(--_chip-accent);
    background: color-mix(in srgb, var(--_chip-accent) 4%, transparent);
  }
  .shape-chip.active,
  .shape-chip.trial {
    border-color: var(--_chip-accent);
    background: color-mix(in srgb, var(--_chip-accent) 8%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--_chip-accent) 35%, transparent);
  }
  .shape-chip:focus-visible {
    outline: 2px solid var(--_chip-accent);
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
    color: var(--primary-text-color, #212121);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .shape-chip {
      transition: none;
    }
  }
  .editor-toolbar .preview-toggle-btn {
    box-sizing: border-box;
    flex: 0 1 auto;
    min-width: 0;
    min-height: 36px;
    padding: 6px 8px 6px 14px;
    gap: 10px;
    font-size: 14px;
    color: var(--primary-text-color, #212121);
  }
  .message-line .command-status {
    min-width: 0;
    font-size: 12px;
    line-height: 1.25;
  }
  .message-line .command-status [role='alert'] {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    color: var(--error-color, #db4437);
  }
  .message-line .command-status [role='status'] {
    color: var(--secondary-text-color, #616161);
  }
  .message-line .command-retry {
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
  .message-line button:focus-visible,
  .editor-toolbar button:focus-visible {
    outline: 2px solid var(--primary-color, #2563eb);
    outline-offset: 2px;
  }
  /* Header controls: chips, Watch and Undo (wide panel), the exit slot and ⋮, last. */
  .editor-toolbar {
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
    min-height: 44px;
    font-family: inherit;
    color: var(--primary-text-color, #212121);
  }
  .editor-toolbar:focus {
    outline: none;
  }
  /* One footprint for Edit, Done, Cancel + Save and Saved, so Watch and ⋮ never move. */
  .exit-slot {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 184px;
    min-height: 36px;
  }
  .exit-slot[data-state='empty'] {
    min-width: 0;
  }
  .exit-button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms ease;
  }
  .exit-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
  }
  .exit-button:active:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 10%, transparent);
  }
  .exit-button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  /* The pencil is a ghost pill reading Edit. */
  .edit-button {
    border-color: var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 18px;
  }
  /* Done and Save are the filled blue commands; never the theme's accent. */
  .exit-button.primary {
    border-color: #2563eb;
    background: #2563eb;
    color: #fff;
  }
  .exit-button.primary:hover:not(:disabled) {
    background: color-mix(in srgb, #2563eb 88%, #000);
  }
  .exit-icon {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
  }
  /* A confirmed save: a blue checkmark and Saved, briefly, then Edit. */
  .save-confirmed {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 6px;
    color: #2563eb;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }
  .more-anchor {
    position: relative;
    flex: 0 0 auto;
  }
  .more-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    cursor: pointer;
  }
  .more-button svg {
    width: 20px;
    height: 20px;
  }
  .more-button:hover,
  .more-button[aria-expanded='true'] {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
  }
  .more-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: 6px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 12px;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  }
  .more-item {
    box-sizing: border-box;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
  }
  .more-item:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
  }
  .more-item:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .more-item.delete-group-btn {
    color: var(--error-color, #db4437);
  }
  .editor-toolbar .invitation-replay {
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
  .editor-toolbar .invitation-replay:disabled {
    opacity: 0.5;
    cursor: default;
  }
  @media (prefers-reduced-motion: reduce) {
    .exit-button {
      transition: none;
    }
  }
  /* Phones: 44px targets; the pencil may drop its word. The exit slot keeps its
     width, so entering Edit never reflows the header under a gesture. */
  @media ${ui} {
    .exit-button,
    .more-button,
    .editor-toolbar .preview-toggle-btn {
      min-height: 44px;
    }
    .more-button {
      width: 44px;
      height: 44px;
    }
    .edit-button {
      width: 44px;
      padding: 0;
    }
    .edit-button .exit-label {
      display: none;
    }
  }
`;const wi={phase:"idle"};class xi{constructor(t,e=8e3,i=2e3){this._host=t,this._confirmTimeoutMs=e,this._successDisplayMs=i,this._confirmTimer=null,this._successTimer=null,this._generation=0,this._resolve=null}currentGeneration(){return this._generation}arm(){const t=++this._generation;this._clearConfirmTimer(),this._settle("error");const e=new Promise(e=>{this._resolve=e,this._confirmTimer=setTimeout(()=>{this._confirmTimer=null,this._generation===t&&["saving","confirming"].includes(this._host.getSavePhase())&&this._host.dispatchSave({type:"save-error",message:"Save confirmation timed out."})},this._confirmTimeoutMs)});return{generation:t,settled:e}}confirm(t){"confirming"===this._host.getSavePhase()&&t===this._generation&&(this._host.dispatchSave({type:"save-confirmed"}),this._clearSuccessTimer(),this._successTimer=setTimeout(()=>{this._successTimer=null,"saved"===this._host.getSavePhase()&&this._host.dispatchSave({type:"save-clear"})},this._successDisplayMs))}fail(t,e){["saving","confirming"].includes(this._host.getSavePhase())&&t===this._generation&&this._host.dispatchSave({type:"save-error",message:e})}onLeaveConfirming(t,e){this._clearConfirmTimer(),(e||"error"===t)&&this._settle("error"===t?"error":"confirmed")}settleError(){this._settle("error")}dispose(){this._clearSuccessTimer(),this._clearConfirmTimer(),this._settle("error")}_settle(t){const e=this._resolve;e&&(this._resolve=null,e(t))}_clearConfirmTimer(){this._confirmTimer&&(clearTimeout(this._confirmTimer),this._confirmTimer=null)}_clearSuccessTimer(){this._successTimer&&(clearTimeout(this._successTimer),this._successTimer=null)}}const $i={loaded:!1,loading:!1,loadError:null};function Ii(t){return{...t,loaded:!1,loadedEntityId:void 0}}const ki=2,Si=t=>(...e)=>({_$litDirective$:t,values:e});let Ci=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};const{I:Ei}=at,Pi=t=>t,Ai=()=>document.createComment(""),Ti=(t,e,i)=>{const s=t._$AA.parentNode,r=void 0===e?t._$AB:e._$AA;if(void 0===i){const e=s.insertBefore(Ai(),r),n=s.insertBefore(Ai(),r);i=new Ei(e,n,t,t.options)}else{const e=i._$AB.nextSibling,n=i._$AM,o=n!==t;if(o){let e;i._$AQ?.(t),i._$AM=t,void 0!==i._$AP&&(e=t._$AU)!==n._$AU&&i._$AP(e)}if(e!==r||o){let t=i._$AA;for(;t!==e;){const e=Pi(t).nextSibling;Pi(s).insertBefore(t,r),t=e}}}return i},Ri=(t,e,i=t)=>(t._$AI(e,i),t),Li={},Mi=(t,e=Li)=>t._$AH=e,Di=t=>{t._$AR(),t._$AA.remove()},Gi=Si(class extends Ci{constructor(){super(...arguments),this.key=K}render(t,e){return this.key=t,e}update(t,[e,i]){return e!==this.key&&(Mi(t),this.key=e),i}});let Hi=0;const Oi={diag:[0,100],floor:[0,0],ceil:[100,100]};function Fi(t,e,i){return null===i?Nt[t%Nt.length]:e===i?"":Nt[t%(Nt.length-1)+1]}function Ui(t,e){return V`
    <defs>
      <linearGradient id="${t}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${e}" stop-opacity="0.45" />
        <stop offset="100%" stop-color="${e}" stop-opacity="0.08" />
      </linearGradient>
    </defs>`}function Ni(t){return Array.from({length:101},(e,i)=>Gt(t,100*i/100))}function Bi(t){return t.from.map((e,i)=>e+(t.to[i]-e)*t.progress)}class zi extends ct{constructor(){super(),this.curves=[],this.selectedCurveId=null,this.entityId=null,this.readOnly=!1,this.scrubberPosition=null,this.watching=!1,this.showXAxisLabel=!1,this.previewCurve=null,this.exampleEntityId=null,this.exampleInstruction=null,this.exampleInput="mouse",this.exampleCue=null,this.joy=Vt,this.curveFrame=null,this.drawIn=null,this.drawOut=null,this.hoveredCurveId=null,this._dragCurveIdx=-1,this._dragPointIdx=-1,this._hoveredPoint=null,this._focusedPoint=null,this._isMobile=!1,this._labelScale=1,this._settle=null,this._flash=null,this._reveal=null,this._previewMorph=null,this._uid=(Hi++).toString(36),this._mql=null,this._wasDragging=!1,this._longPressTimer=null,this._longPressFired=!1,this._touchTapStart=null,this._lastTouchTap=null,this._suppressDblClickUntil=0,this._dragStartTarget=null,this._dragPointerId=null,this._pointPress=null,this._hero=null,this._plotW=It,this._reachStart=null,this._dragInput="mouse",this._dragReleaseTimer=null,this._cancelSettleLoop=null,this._heldLines=[],this._flashToken=0,this._flashTimer=null,this._cancelDrawInLoop=null,this._drawInObserver=null,this._labelResizeObserver=null,this._pendingDrawInToken=null,this._drawInStartTimer=null,this._lastDrawInToken=-1,this._cancelPreviewMorphLoop=null,this._previewShown=null,this._settlePoint=null,this._onDrawInIntersection=t=>{const e=t.find(t=>t.target===this);if(!e)return;const i=e.isIntersecting&&e.intersectionRatio>=.5,s=this._pendingDrawInToken;if(i&&null!==s&&this.drawIn?.token===s&&!1!==this.drawIn.ready)this._scheduleDrawInStart(s);else if(i||null===s){if(!i&&this._reveal&&null===s){const t=this._reveal.token;this._waitForDrawInVisibility(t),this.dispatchEvent(new CustomEvent("draw-in-waiting",{detail:{token:t},bubbles:!0,composed:!0}))}}else this._cancelDrawInStart()},this._onMqlChange=t=>{this._isMobile=t.matches},this._onWindowBlur=()=>{this.cancelInteraction()},this._updateLabelScale=()=>{const t=this._svgRef?.getBoundingClientRect();if(!t||t.width<=0||t.height<=0)return;const e=getComputedStyle(this._svgRef).maxHeight,i=e.endsWith("px")?Number(e.slice(0,-2)):NaN,s=function(t,e){return t>0&&e>0?t*St/356<=e?It:Tt(St*t/e-xt-12,It,688):It}(t.width,i),r=Math.min(t.width/(xt+s+12),t.height/St);this._labelScale=Ct(r),Math.abs(s-this._plotW)<.01||(this._plotW=s,this.updateComplete.then(()=>this.dispatchEvent(new Event("plot-resize"))))};const t=()=>{this._stopSettle(),this._stopFlash()};this.addEventListener("pointerdown",t,!0),this.addEventListener("keydown",t,!0)}_interaction(t,e){this.dispatchEvent(new CustomEvent("graph-interaction",{detail:{phase:t,input:e},bubbles:!0,composed:!0}))}get interactionActive(){return null!==this._dragPointerId||null!==this._touchTapStart}get _hoverTarget(){const t=this.hoveredCurveId;return!t||this.interactionActive||this._dragCurveIdx>=0?null:this.curves.some(e=>e.entityId===t)?t:null}focusPoint(t,e){const i=this.curves.findIndex(e=>e.entityId===t),s=this.curves[i]?.controlPoints.findIndex(t=>t.lightener===e)??-1,r=this.renderRoot.querySelector(`.hit-circle[data-curve="${i}"][data-point="${s}"]`);return!!r&&(r.focus({preventScroll:!0}),!0)}cancelInteraction(){const t=this._finishPointPress("cancel"),e=this._touchTapStart?.pointerId;this._dragCurveIdx=-1,this._dragPointIdx=-1,this._dragPointerId=null,this._pointPress=null,this._dragStartTarget=null,this._heldLines=[],this._clearLongPress(),this._longPressFired=!1,this._touchTapStart=null,this._lastTouchTap=null,this._suppressDblClickUntil=0,this._wasDragging=!1,null!==this._dragReleaseTimer&&clearTimeout(this._dragReleaseTimer),this._dragReleaseTimer=null,this._hoveredPoint=null,this._focusedPoint=null,this._stopSettle(),this._stopFlash();for(const t of[this._svgRef,...this.renderRoot.querySelectorAll("rect")])null!=e&&t?.hasPointerCapture?.(e)&&t.releasePointerCapture(e);t||null==e||this._interaction("cancel",this._dragInput)}_x(t){return Et(t,this._plotW)}_getSvgCoords(t){const e=this._svgRef;if(!e)return null;const i=e.getScreenCTM();if(!i)return null;let s;try{s=i.inverse()}catch{return null}if(!s||isNaN(s.a))return null;const r=e.createSVGPoint();r.x=t.clientX,r.y=t.clientY;const n=r.matrixTransform(s);return{x:At(n.x,this._plotW),y:(o=n.y,100*(1-(o-$t)/kt))};var o}_dispatchPointAddFromEvent(t){const e=this._getSvgCoords(t);if(!e)return!1;const i=Math.round(Tt(e.x,1,100)),s=Math.round(Tt(e.y,0,100));return this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-add",{detail:{lightener:i,target:s,entityId:this.selectedCurveId},bubbles:!0,composed:!0})),!0}_isNonMousePointer(t){return""!==t.pointerType&&"mouse"!==t.pointerType}_touchMoveDistance(t,e){return Math.hypot(e.clientX-t.clientX,e.clientY-t.clientY)}_isCurveInteractive(t){return!this.readOnly&&(null===this.selectedCurveId||this.curves[t]?.entityId===this.selectedCurveId)}_focusCurve(t){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_beginReach(t,e){const i=this.curves[t]?.controlPoints,s=this._reachStart;if(!i?.[e])return;if(s?.curve===t&&s.point===e&&s.count===i.length)return;this._reachStart={curve:t,point:e,count:i.length,x:i[e].lightener};const r=this.curves[t].entityId;this._hero={entityId:r,point:e,count:i.length}}_reachFrom(t,e){const i=this._reachStart,s=this.curves[t]?.controlPoints;return i?.curve===t&&i.point===e&&i.count===s?.length?i.x:void 0}_isHeldPoint(t,e){return Rt(this.curves[t]?.controlPoints??[],e,this._reachFrom(t,e))}_onPointFocus(t,e){this._interaction("start","keyboard");const i=this.curves[t];i&&(this._beginReach(t,e),this._focusedPoint={curve:t,point:e},this._hoveredPoint={curve:t,point:e},this._focusCurve(i.entityId))}_onPointBlur(t,e){(t===this._dragCurveIdx&&e===this._dragPointIdx||this._longPressFired&&this.curves[t]?.entityId===this._pointPress?.entityId)&&this._finishPointPress("cancel"),this._focusedPoint?.curve===t&&this._focusedPoint?.point===e&&(this._focusedPoint=null),this._reachStart?.curve===t&&this._reachStart.point===e&&this._dragCurveIdx<0&&(this._reachStart=null),this._hoveredPoint?.curve===t&&this._hoveredPoint?.point===e&&(this._hoveredPoint=null)}_dispatchKeyboardMove(t,e,i,s){const r=this._pointPress,n=this.curves[t]?.controlPoints[e];r&&n&&(n.lightener!==i||n.target!==s)&&(r.keyboardEdited=!0,this._clearLongPress()),this.joy.diagonal&&t===this._dragCurveIdx&&e===this._dragPointIdx&&(this._heldLines=se(e,i,s,this._heldLines).held),this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:t,pointIndex:e,lightener:i,target:s},bubbles:!0,composed:!0})),r||this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:t,pointIndex:e},bubbles:!0,composed:!0}))}_getKeyboardInsertPoint(t,e){const i=t.controlPoints[e],s=t.controlPoints[e+1],r=t.controlPoints[e-1];return s&&s.lightener-i.lightener>1?{lightener:Math.round((i.lightener+s.lightener)/2),target:Math.round((i.target+s.target)/2)}:r&&i.lightener-r.lightener>1?{lightener:Math.round((r.lightener+i.lightener)/2),target:Math.round((r.target+i.target)/2)}:null}_onPointKeyDown(t,e,i){this._interaction("start","keyboard");const s=this.curves[e],r=s?.controlPoints[i];if(!s||!r)return;if(this.selectedCurveId!==s.entityId&&this._focusCurve(s.entityId),this._isHeldPoint(e,i)&&("ArrowRight"===t.key||"ArrowLeft"===t.key))return;const n=t.shiftKey?10:1,{min:o,max:a}=Lt(s.controlPoints,i,this._reachFrom(e,i));if("ArrowRight"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.min(a,r.lightener+n),r.target);if("ArrowLeft"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,Math.max(o,r.lightener-n),r.target);if("ArrowUp"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,r.lightener,Math.min(100,r.target+n));if("ArrowDown"===t.key)return t.preventDefault(),void this._dispatchKeyboardMove(e,i,r.lightener,Math.max(0,r.target-n));if("Enter"===t.key){const n=this._getKeyboardInsertPoint(s,i);if(!n)return;t.preventDefault(),this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-add",{detail:{entityId:s.entityId,lightener:n.lightener,target:n.target},bubbles:!0,composed:!0}));const o=i+(n.lightener<r.lightener?1:0);return void this._refocusHitCircle(e,o).catch(()=>{})}(" "===t.key||"Delete"===t.key||"Backspace"===t.key)&&!Rt(s.controlPoints,i)&&s.controlPoints.length>2&&(t.preventDefault(),this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0})),this._refocusHitCircle(e,Math.max(1,i-1)).catch(()=>{}))}async _refocusHitCircle(t,e){await Promise.resolve(),await this.updateComplete;const i=this.renderRoot.querySelector(`.hit-circle[data-curve="${t}"][data-point="${e}"]`);i&&i.focus()}_onPointerDown(t,e,i){if(0!==t.button)return;if(null!==this._dragPointerId)return;if(!this._isCurveInteractive(e))return;const s=this.curves[e];s?.controlPoints[i]&&(this._dragInput=t.pointerType||"mouse",this._interaction("start",this._dragInput),t.preventDefault(),this._longPressFired=!1,this._dragStartTarget=this.curves[e]?.controlPoints[i]?.target??null,this._beginReach(e,i),this._dragPointerId=t.pointerId,this._pointPress={clientX:t.clientX,clientY:t.clientY,entityId:s.entityId,groupId:this.entityId,dragging:!1,keyboardEdited:!1},this._heldLines=[],this._clearLongPress(),Rt(this.curves[e]?.controlPoints??[],i)||(this._longPressTimer=setTimeout(()=>{this._longPressTimer=null,this._pointPressIsCurrent()?(this._longPressFired=!0,this._dragCurveIdx=-1,this._dragPointIdx=-1,this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0}))):this._finishPointPress("cancel")},500)),this._svgRef?.setPointerCapture(t.pointerId),this._dragCurveIdx=e,this._dragPointIdx=i)}_clearLongPress(){this._longPressTimer&&(clearTimeout(this._longPressTimer),this._longPressTimer=null)}_onPointerMove(t){const e=this._pointPress;if(!e||this._dragCurveIdx<0||t.pointerId!==this._dragPointerId)return;if(!this._pointPressIsCurrent())return void this._finishPointPress("cancel");t.preventDefault();const i=Math.hypot(t.clientX-e.clientX,t.clientY-e.clientY);if(!e.dragging){if(i<6)return;this._clearLongPress(),e.dragging=!0}const s=this._getSvgCoords(t);if(!s)return;const r=this.curves[this._dragCurveIdx],{min:n,max:o}=Lt(r?.controlPoints??[],this._dragPointIdx,this._reachFrom(this._dragCurveIdx,this._dragPointIdx)),a=0===this._dragPointIdx?this.curves[this._dragCurveIdx]?.controlPoints[0]?.lightener??0:Math.round(Tt(s.x,n,o)),h=Tt(s.y,0,100),l=this.joy.diagonal?function(t,e,i,s){if(!(s>0&&Number.isFinite(i)))return null;const r=Math.min(9.2/s,3.45);let n=null,o=1/0;for(const s of t>0?[e,0,100]:[0,100]){const t=Math.abs(i-s);t<=r&&t<o&&(n=s,o=t)}return n}(this._dragPointIdx,a,h,this._pxPerStep()):null,d=l??Math.round(h);this.dispatchEvent(new CustomEvent("point-move",{detail:{curveIndex:this._dragCurveIdx,pointIndex:this._dragPointIdx,lightener:a,target:d},bubbles:!0,composed:!0})),this.joy.diagonal&&!this.readOnly&&this._noteDiagonalHit(a,d)}_onPointerUp(t){if(null===this._dragPointerId||t.pointerId!==this._dragPointerId)return;t.preventDefault();const e=this._pointPress,i="pointerup"===t.type,s=i&&null!==e&&!e.dragging&&!e.keyboardEdited&&!this._longPressFired&&this._pointPressIsCurrent()&&Math.hypot(t.clientX-e.clientX,t.clientY-e.clientY)<6;this._finishPointPress(i?"end":"cancel",i),s&&e&&this._focusCurve(e.entityId)}_pxPerStep(){const t=this._svgRef?.getScreenCTM?.()?.d??0;return Math.abs(t)*(Pt(0)-Pt(1))||0}_pointPressIsCurrent(){return null!==this._pointPress&&this._pointPress.groupId===this.entityId&&this.curves[this._dragCurveIdx]?.entityId===this._pointPress.entityId&&void 0!==this.curves[this._dragCurveIdx]?.controlPoints[this._dragPointIdx]&&this._isCurveInteractive(this._dragCurveIdx)}_finishPointPress(t,e=!1){if(null===this._dragPointerId)return!1;const i=this._dragPointerId,s=this._dragCurveIdx,r=this._dragPointIdx,n=this._dragStartTarget,o=!0===this._pointPress?.dragging&&!this._longPressFired,a=o||!0===this._pointPress?.keyboardEdited;return this._clearLongPress(),this._dragCurveIdx=-1,this._dragPointIdx=-1,this._dragPointerId=null,this._pointPress=null,this._dragStartTarget=null,this._longPressFired=!1,this._focusedPoint?.curve===s&&this._focusedPoint.point===r||(this._reachStart=null),this._svgRef?.hasPointerCapture?.(i)&&this._svgRef.releasePointerCapture(i),a&&(this.dispatchEvent(new CustomEvent("point-drop",{detail:{curveIndex:s,pointIndex:r},bubbles:!0,composed:!0})),this._wasDragging=!0,null!==this._dragReleaseTimer&&clearTimeout(this._dragReleaseTimer),this._dragReleaseTimer=setTimeout(()=>{this._wasDragging=!1,this._dragReleaseTimer=null},400)),this._interaction(t,this._dragInput),e&&o&&this._startSettle(s,r,n),!0}_startSettle(t,e,i){if(!Zt(this.joy,"settle"))return;const s=this.curves[t],r=s?.controlPoints[e];if(null===i||!s||!r)return;const n=Math.sign(r.target-i);0!==n&&(this._stopSettle(),this._settlePoint={entityId:s.entityId,curve:t,point:e,lightener:r.lightener,target:r.target},this._cancelSettleLoop=Qt(250,i=>{Jt()?this._stopSettle():this._settle={curve:t,point:e,dy:te(i,n)}},()=>this._stopSettle()))}_settlePointUnchanged(){const t=this._settlePoint;if(!t)return!1;const e=this.curves[t.curve],i=e?.controlPoints[t.point];return e?.entityId===t.entityId&&i?.lightener===t.lightener&&i?.target===t.target}_noteDiagonalHit(t,e){const{held:i,landed:s}=se(this._dragPointIdx,t,e,this._heldLines);this._heldLines=i,s&&(Jt()||this._startFlash(s),"function"==typeof navigator.vibrate&&window.matchMedia?.("(pointer: coarse)").matches&&navigator.vibrate(5))}_startFlash(t){this._stopFlash(),this._flash={kind:t,token:++this._flashToken},this._flashTimer=setTimeout(()=>this._stopFlash(),400)}_stopFlash(){this._flashTimer&&clearTimeout(this._flashTimer),this._flashTimer=null,this._flash=null}_renderDiagonalFlash(){const t=this._flash;if(!t)return K;const[e,i]=Oi[t.kind];return Gi(t.token,V`<line class="diagonal-flash" x1=${this._x(0)} y1=${Pt(e)}
        x2=${this._x(100)} y2=${Pt(i)} pointer-events="none" />`)}_stopSettle(){this._cancelSettleLoop?.(),this._cancelSettleLoop=null,this._settlePoint=null,this._settle=null}_startDrawIn(t){this._stopDrawIn(),this._reveal={token:t,progress:0},this.dispatchEvent(new CustomEvent("draw-in-started",{detail:{token:t,pointCount:this._drawInPointCount()},bubbles:!0,composed:!0})),this._cancelDrawInLoop=Qt(Kt,e=>{this._reveal={token:t,progress:zt(e/Kt)}},()=>{this._reveal={token:t,progress:1}})}_stopDrawIn(){this._cancelDrawInLoop?.(),this._cancelDrawInLoop=null,this._cancelDrawInStart(),this._pendingDrawInToken=null,this._reveal=null}_scheduleDrawInStart(t){null===this._drawInStartTimer&&(this._drawInStartTimer=setTimeout(()=>{this._drawInStartTimer=null,this._pendingDrawInToken===t&&this.drawIn?.token===t&&!1!==this.drawIn.ready&&this._startDrawIn(t)},200))}_cancelDrawInStart(){null!==this._drawInStartTimer&&clearTimeout(this._drawInStartTimer),this._drawInStartTimer=null}_waitForDrawInVisibility(t){this._stopDrawIn(),this._pendingDrawInToken=t,this._reveal={token:t,progress:0},!1!==this.drawIn?.ready&&(this._drawInObserver?(this._drawInObserver.unobserve(this),this._drawInObserver.observe(this)):this._scheduleDrawInStart(t))}_drawInPointCount(){return this.readOnly?0:this.curves.reduce((t,e,i)=>this.drawIn?.ids.has(e.entityId)&&this._isCurveInteractive(i)?e.controlPoints.reduce((t,e,i)=>null===this.scrubberPosition||e.lightener<=this.scrubberPosition?Math.max(t,i+1):t,t):t,0)}_revealFor(t){return this.drawIn?.ids.has(t.entityId)?this._reveal:null}_drawInClipId(t,e){return`draw-in-${this._uid}-${e}-${t}`}_drawInDotClipId(t,e){return`draw-in-dot-${this._uid}-${e}-${t}`}_drawInClipFor(t,e){const i=this._revealFor(t);return i?`url(#${this._drawInClipId(e,i.token)})`:K}_drawInDotClipFor(t,e){const i=this._revealFor(t);return i?`url(#${this._drawInDotClipId(e,i.token)})`:K}_onPointContextMenu(t,e,i){t.preventDefault(),t.stopPropagation(),this.readOnly||this._isCurveInteractive(e)&&(Rt(this.curves[e]?.controlPoints??[],i)||(this._interaction("start","mouse"),this._finishPointPress("end"),this.dispatchEvent(new CustomEvent("point-remove",{detail:{curveIndex:e,pointIndex:i},bubbles:!0,composed:!0}))))}_onDblClick(t){this.readOnly||this._wasDragging||(performance.now()<this._suppressDblClickUntil?t.preventDefault():(this._interaction("start","mouse"),this._dispatchPointAddFromEvent(t)))}_onHitAreaPointerDown(t){this.readOnly||(this._interaction("start",t.pointerType||"mouse"),this._isNonMousePointer(t)&&(this._touchTapStart={pointerId:t.pointerId,pointerType:t.pointerType,clientX:t.clientX,clientY:t.clientY,startedAt:performance.now()},t.currentTarget.setPointerCapture?.(t.pointerId)))}_onHitAreaPointerUp(t){if(this.readOnly)return;if(!this._isNonMousePointer(t))return;const e=this._touchTapStart;if(this._touchTapStart=null,this._interaction("end",t.pointerType),!e||e.pointerId!==t.pointerId||e.pointerType!==t.pointerType)return;if(this._touchMoveDistance(e,t)>12)return void(this._lastTouchTap=null);const i=performance.now(),s=this._lastTouchTap;null!==s&&s.pointerType===t.pointerType&&i-s.startedAt<=350&&this._touchMoveDistance(s,t)<=12?(this._lastTouchTap=null,this._dispatchPointAddFromEvent(t)&&(t.preventDefault(),this._suppressDblClickUntil=i+450)):this._lastTouchTap={pointerId:t.pointerId,pointerType:t.pointerType,clientX:t.clientX,clientY:t.clientY,startedAt:i}}_onHitAreaPointerCancel(t){this._touchTapStart?.pointerId===t.pointerId&&(this._touchTapStart=null,this._interaction("cancel",t.pointerType))}_renderGrid(){return V`
      <defs>
        <clipPath id="graph-area-${this._uid}">
          <rect x="${14}" y="${-18}" width="${this._plotW+60}" height="${260}" />
        </clipPath>
        ${this.drawIn?this.curves.map((t,e)=>{const i=this._revealFor(t);return i?(()=>{const t=xt+this._plotW+10,s=null===this.scrubberPosition?t:Tt(this._x(this.scrubberPosition),34,t),r=Math.min(t,s+(null===this.scrubberPosition?0:4)),n=Math.max(0,r-34)*i.progress,o=Math.max(0,t-s);return V`
                        <clipPath class="draw-in-clip" id="${this._drawInClipId(e,i.token)}" clipPathUnits="userSpaceOnUse">
                          <rect class="draw-in-reveal" x="${34}" y="0"
                            width="${n}" height="${St}" />
                          ${o>0?V`<rect class="draw-in-dim-span" x="${s}" y="0"
                                width="${o}" height="${St}" />`:K}
                        </clipPath>
                        <clipPath class="draw-in-dot-clip" id="${this._drawInDotClipId(e,i.token)}" clipPathUnits="userSpaceOnUse">
                          <rect x="${34}" y="0" width="${n}" height="${St}" />
                        </clipPath>`})():K}):K}
      </defs>

      <rect class="plot-frame"
        x="${xt}" y="${$t}"
        width="${this._plotW}" height="${kt}" />

      ${[0,25,50,75,100].map(t=>V`
        <!-- Vertical grid -->
        <line class="grid-line"
          x1="${this._x(t)}" y1="${Pt(0)}"
          x2="${this._x(t)}" y2="${Pt(100)}" />
        <!-- Horizontal grid -->
        <line class="grid-line"
          x1="${this._x(0)}" y1="${Pt(t)}"
          x2="${this._x(100)}" y2="${Pt(t)}" />
        <!-- X tick labels -->
        <text class="tick-label" text-anchor="middle"
          x="${this._x(t)}" y="${Pt(0)+16*this._labelScale}">${t}%</text>
        <!-- Y tick labels -->
        <text class="tick-label" text-anchor="end" dominant-baseline="middle"
          x="${38}" y="${Pt(t)}">${t}%</text>
      `)}

      ${this.showXAxisLabel?V`<text class="axis-label x-axis-label" text-anchor="middle"
              x="${xt+this._plotW/2}" y="${Pt(0)+32*this._labelScale}">${mt.scrubber.title}</text>`:K}
      <text class="axis-label" text-anchor="middle"
        transform="rotate(-90, 10, ${112})"
        x="10" y="${112}">${mt.graph.yAxisLabel}</text>
    `}_renderAxes(){return V`<g class="graph-axes" pointer-events="none">
      <line class="axis-line"
        x1="${xt}" y1="${Pt(0)}"
        x2="${xt+this._plotW}" y2="${Pt(0)}" />
      <line class="axis-line"
        x1="${xt}" y1="${Pt(0)}"
        x2="${xt}" y2="${Pt(100)}" />
    </g>`}_renderCrossHair(t){if(this._dragCurveIdx<0)return K;const e=t.controlPoints[this._dragPointIdx];if(!e)return K;const i=this._x(e.lightener),s=Pt(e.target);return V`
      <line class="crosshair"
        x1="${i}" y1="${s}"
        x2="${i}" y2="${Pt(0)}"
        stroke="${t.color}" opacity="0.5" />
      <line class="crosshair"
        x1="${i}" y1="${s}"
        x2="${xt}" y2="${s}"
        stroke="${t.color}" opacity="0.5" />
    `}_renderTooltip(t,e=t){const i=this._x(e.lightener),s=Pt(e.target),r=`${t.lightener}% → ${t.target}%`,n=Math.ceil(6.2*r.length),o=Tt(i-n/2-2,xt,xt+this._plotW-n-8),a=Math.max(16,s-16);return V`
      <rect class="tooltip-bg"
        x="${o}" y="${a-8}"
        width="${n+8}" height="14" />
      <text class="tooltip-text" text-anchor="start"
        x="${o+4}" y="${a+2}">${r}</text>
    `}_reachPoint(){if(this.readOnly)return null;const t=this._dragCurveIdx>=0&&this._dragPointIdx>=0,e=t?{curve:this._dragCurveIdx,point:this._dragPointIdx}:this._focusedPoint??this._hoveredPoint,i=e?this.curves[e.curve]:void 0;return!e||e.point<=0||!i?.controlPoints[e.point]||this._isHeldPoint(e.curve,e.point)?null:this._isCurveInteractive(e.curve)?{curve:i,point:e.point,dragging:t}:null}_reachRange(t){const e=this.curves.indexOf(t.curve);return Lt(t.curve.controlPoints,t.point,this._reachFrom(e,t.point))}_renderReachDim(){const t=this._reachPoint();if(!t)return K;const{min:e,max:i}=this._reachRange(t),s=this._x(e),r=this._x(i),n=Pt(100),o=t.dragging?.45:.28,a="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))",h=(t,e)=>e>t?V`<rect x="${t}" y="${n}" width="${e-t}" height="${kt}" fill="${a}" />`:K,l=(t,e)=>V`
      <rect x="${e-6}" y="${n}" width="${12}" height="${kt}"
        fill="url(#${t})" />`,d=`reach-fade-left-${this._uid}`,c=`reach-fade-right-${this._uid}`;return V`
      <g class="reach-dim" opacity="${o}" pointer-events="none"
        clip-path="url(#graph-area-${this._uid})">
        <defs>
          <linearGradient id="${d}" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style="stop-color: ${a}" />
            <stop offset="1" style="stop-color: ${a}; stop-opacity: 0" />
          </linearGradient>
          <linearGradient id="${c}" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" style="stop-color: ${a}" />
            <stop offset="1" style="stop-color: ${a}; stop-opacity: 0" />
          </linearGradient>
        </defs>
        ${h(this._x(0)-2,s-6)}
        ${e>0?l(d,s):K}
        ${i<100?l(c,r):K}
        ${h(r+6,this._x(100)+2)}
      </g>
    `}_renderReachBar(){const t=this._reachPoint();if(!t)return K;const{min:e,max:i}=this._reachRange(t);return V`<rect class="reach-bar" pointer-events="none"
      x="${this._x(e)}" y="${Pt(0)-1.5}" width="${this._x(i)-this._x(e)}" height="3"
      rx="1.5" />`}_renderYPill(){if(this._dragCurveIdx<0||this._dragPointIdx<0)return K;const t=this.curves[this._dragCurveIdx]?.controlPoints[this._dragPointIdx];if(!t)return K;const e=Pt(t.target);return V`<g class="y-pill" pointer-events="none">
      <rect x="${10}" y="${e-7}" width="31" height="14" rx="7" />
      <text text-anchor="middle" dominant-baseline="central" x="${25.5}" y="${e}"
        >${t.target}%</text>
    </g>`}_renderScrubberIndicator(){if(null===this.scrubberPosition)return K;const t=this.scrubberPosition,e=this._x(t),i=e-(0===t?2:0),s=100===t?K:V`
      <rect class="scrubber-dim"
        x="${i}" y="${Pt(100)-2}"
        width="${this._x(100)+2-i}" height="${204}"
        fill="var(--graph-bg, var(--ha-card-background, var(--card-background-color, #fff)))"
        fill-opacity="0.8"
        pointer-events="none"
      />
    `,r=V`
      <line class="scrubber-line ${this.watching?"watching":""}"
        x1="${e}" y1="${Pt(0)}"
        x2="${e}" y2="${Pt(100)}" />
    `,n=this.curves.map((i,s)=>{const r=this._frameFor(i),n=Pt(r?Ut(r.pieces,t):Gt(i.controlPoints,t));return V`
          <circle
            class="scrubber-dot"
            clip-path="${this._drawInDotClipFor(i,s)}"
            cx="${e}" cy="${n}"
            r="${4}"
            fill="${i.color}"
            filter="url(#scrubber-glow-${i.color.replace("#","")}-${this._uid})"
            pointer-events="none"
          />
        `}),o=this.readOnly?K:V`
      <rect class="room-edge-hit"
        x="${e-5}" y="${Pt(100)}"
        width="${10}" height="${kt}"
        fill="transparent"
        pointer-events="all"
        @pointerdown=${t=>this.dispatchEvent(new CustomEvent("room-edge-grab",{detail:t,bubbles:!0,composed:!0}))}
      />
    `;return V`${s}${r}${o}${n}`}_frameFor(t){return this.curveFrame?.entityId===t.entityId?this.curveFrame:null}_orderedCurves(){const t=this.selectedCurveId?this.curves.findIndex(t=>t.entityId===this.selectedCurveId):-1;return t>=0?[...this.curves.slice(0,t).map((t,e)=>({curve:t,idx:e})),...this.curves.slice(t+1).map((e,i)=>({curve:e,idx:t+1+i})),{curve:this.curves[t],idx:t}]:this.curves.map((t,e)=>({curve:t,idx:e}))}_renderCurvePaths(t,e){if(!t.controlPoints.length)return K;try{const i=t.entityId===this.selectedCurveId,s=null===this.selectedCurveId||i,r=this._dragCurveIdx===e,n=this._hoverTarget,o=n===t.entityId,a=n?o?1:.14:s?1:.35,h=o?1:n?.06:a,l=`curve-line ${i?"selected":""} ${o?"hovered":""}`,d=this._frameFor(t),c=bt(t.controlPoints),p=d?function(t,e=300){if(!t.length)return"";let i=`M${Et(t[0].x0,e)},${Pt(t[0].y[0])}`;for(const s of t){const t=(s.x1-s.x0)/3;i+=` C${Et(s.x0+t,e)},${Pt(s.y[1])} ${Et(s.x1-t,e)},${Pt(s.y[2])} ${Et(s.x1,e)},${Pt(s.y[3])}`}return i}(d.pieces,this._plotW):Ot(c.map(t=>({x:this._x(t.lightener),y:Pt(t.target)}))),u=d?d.pieces[d.pieces.length-1]?.x1??100:c[c.length-1].lightener,_=p+` L${this._x(u)},${Pt(0)}`+` L${this._x(0)},${Pt(0)} Z`,v=`grad-${e}-${this._uid}`,g=Fi(e,t.entityId,this.selectedCurveId),m=i||o,f=this._drawInClipFor(t,e);return V`
        ${m?V`
              ${Ui(v,t.color)}
              <path
                class="curve-fill"
                clip-path="${f}"
                d="${_}"
                fill="url(#${v})"
                style="opacity: ${h}"
                pointer-events="none"
              />`:K}
        ${r?this._renderCrossHair(t):K}
        <path
          class="${l}"
          clip-path="${f}"
          d="${p}"
          stroke="${t.color}"
          stroke-dasharray="${g}"
          style="opacity: ${a}"
          pointer-events="none"
        />
      `}catch{return K}}_renderDrawOut(){const t=this.drawOut;if(!t||!Zt(this.joy,"draw_in"))return K;const e=new Set(this.curves.map(t=>t.entityId)),i=t.selectedCurveId;return Gi(t.token,V`<g class="draw-out" pointer-events="none">${t.curves.map(({curve:s,index:r})=>{if(e.has(s.entityId)||!s.controlPoints.length)return K;const n=s.entityId===i,o=Ot(bt(s.controlPoints).map(t=>({x:this._x(t.lightener),y:Pt(t.target)}))),a=`draw-out-${t.token}-${r}-${this._uid}`;return V`
          ${n?V`${Ui(a,s.color)}
                <path d="${o} L${this._x(100)},${Pt(0)} L${this._x(0)},${Pt(0)} Z"
                  fill="url(#${a})" />`:K}
          <path
            class="curve-line ${n?"selected":""}"
            d="${o}"
            stroke="${s.color}"
            stroke-dasharray="${Fi(r,s.entityId,i)}"
            style="opacity: ${null===i||n?1:.35}"
          />`})}</g>`)}_renderCurvePoints(t,e){if(!t.controlPoints.length)return K;try{const i=this._isCurveInteractive(e);if(!(i&&!this.readOnly))return K;const s=this._dragCurveIdx===e,r=t.color+"33";let n=-1;s&&this._dragPointIdx>=0?n=this._dragPointIdx:this._hoveredPoint?.curve!==e&&this._focusedPoint?.curve!==e||(n=this._focusedPoint?.curve===e?this._focusedPoint.point:this._hoveredPoint?.point??-1);const o=t.controlPoints[n]??null,a=this._frameFor(t)?.knots??null,h=this._revealFor(t),l=this._hoverTarget;return V`
        ${t.controlPoints.map((i,n)=>{const o=null!==h&&(null===this.scrubberPosition||i.lightener<=this.scrubberPosition),d=a?.[n]??i,c=0===n,p=s&&this._dragPointIdx===n,u=this._hoveredPoint?.curve===e&&this._hoveredPoint?.point===n,_=null!==this.scrubberPosition&&i.lightener>this.scrubberPosition,v=this._focusedPoint?.curve===e&&this._focusedPoint?.point===n,g=(null!==l&&l!==t.entityId&&!p&&!v?.16:_?.35:1)*(t.entityId===this.exampleEntityId&&i.lightener===this.exampleCue?.lightener?this.exampleCue.markerOpacity??1:1),m=this._settle?.curve===e&&this._settle.point===n?this._settle.dy:0,f=function(t,e,i,s,r,n,o,a,h){const l=`--glow-color: ${h}; opacity: ${a}`,d=`${r} shape-${t}`;switch(t){case"circle":return V`<circle
        class="${d}"
        cx="${e}"
        cy="${i}"
        r="${s}"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${l}"
        pointer-events="none"
      />`;case"square":{const t=1.15*s;return V`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-t/2}"
        width="${t}"
        height="${t}"
        rx="1.5"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${l}"
        pointer-events="none"
      />`}case"diamond":{const t=1.3*s;return V`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-t/2}"
        width="${t}"
        height="${t}"
        rx="1"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${l}"
        pointer-events="none"
      />`}case"triangle":{const t=1.15*s,r=1.3*s;return V`<polygon
        class="${d}"
        points="${e},${i-t} ${e-r},${i+.65*t} ${e+r},${i+.65*t}"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${l}"
        pointer-events="none"
      />`}case"bar":{const t=2*s,r=.75*s;return V`<rect
        class="${d}"
        x="${e-t/2}"
        y="${i-r/2}"
        width="${t}"
        height="${r}"
        rx="1.5"
        fill="${n}"
        stroke="${o}"
        stroke-width="2"
        style="${l}"
        pointer-events="none"
      />`}default:return t}}(Bt[e%Bt.length],this._x(d.lightener),Pt(d.target)+m,6,`control-point ${c?"origin":""} ${p?"dragging":""} ${u?"hovered":""} ${this._focusedPoint?.curve===e&&this._focusedPoint?.point===n?"focused":""}`,r,t.color,g,t.color),y=this._hero?.entityId===t.entityId&&this._hero.point===n&&this._hero.count===t.controlPoints.length;return V`
            ${y?V`<circle class="hero-ring" pointer-events="none"
                    cx="${this._x(d.lightener)}" cy="${Pt(d.target)+m}" r="11"
                    stroke="${t.color}" style="opacity: ${.35*g}" />`:K}
            <circle
              class="hit-circle ${c?"origin-hit":""}"
              data-curve="${e}"
              data-point="${n}"
              cx="${this._x(d.lightener)}"
              cy="${Pt(d.target)}"
              r="${this._isMobile?28:22}"
              fill="transparent"
              pointer-events="all"
              tabindex="0"
              role="button"
              aria-describedby=${t.entityId===this.exampleEntityId?`example-${this._uid}`:K}
              aria-label="${t.friendlyName} point ${i.lightener}% group brightness to ${i.target}% light brightness. ${0===n?"Arrow Up/Down to adjust starting brightness. Cannot be moved horizontally.":this._isHeldPoint(e,n)?"Arrow Up/Down to adjust brightness at full room brightness. Cannot be moved horizontally.":Rt(t.controlPoints,n)?"Arrow keys move, Enter adds a nearby point.":"Arrow keys move, Enter adds a nearby point, Space removes."}"
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
            ${o&&h?null!==this._pendingDrawInToken?V`<g class="marker-wait" visibility="hidden">${f}</g>`:Gi(`${h.token}:${t.entityId}:${n}`,V`<g class="marker-pop"
                    style="animation-delay: ${Kt+40*n}ms">${f}</g>`):f}
          `})}
        ${null!==o?this._renderTooltip(o,a?.[n]??o):K}
      `}catch{return K}}willUpdate(t){this._pointPress&&(t.has("entityId")||t.has("readOnly")&&this.readOnly||!this._longPressFired&&!this._pointPressIsCurrent())&&this._finishPointPress("cancel"),t.has("entityId")&&this._stopDrawIn();const e=this.drawIn,i=null!==e&&this.isConnected&&Zt(this.joy,"draw_in"),s=null!==e&&(this._reveal?.token===e.token||this._pendingDrawInToken===e.token);if(e&&s&&i||this._stopDrawIn(),e&&e.token>this._lastDrawInToken?(this._lastDrawInToken=e.token,i&&this._waitForDrawInVisibility(e.token)):i&&t.has("drawIn")&&this._pendingDrawInToken===e.token&&!1!==e.ready&&this._waitForDrawInVisibility(e.token),t.has("joy")&&!this.joy.diagonal&&this._stopFlash(),(t.has("previewCurve")||t.has("joy"))&&this._syncPreviewMorph(),!this._cancelSettleLoop)return;const r=t.has("joy")&&!this.joy.settle,n=t.has("curves")&&!this._settlePointUnchanged();(r||n)&&this._stopSettle()}connectedCallback(){super.connectedCallback(),this._mql=window.matchMedia("(max-width: 500px)"),this._isMobile=this._mql.matches,this._mql.addEventListener("change",this._onMqlChange),window.addEventListener("blur",this._onWindowBlur),this.updateComplete.then(()=>{this.isConnected&&!this._labelResizeObserver&&this._svgRef&&(this._updateLabelScale(),"undefined"!=typeof ResizeObserver&&(this._labelResizeObserver=new ResizeObserver(this._updateLabelScale),this._labelResizeObserver.observe(this._svgRef)))}),"undefined"!=typeof IntersectionObserver&&(this._drawInObserver=new IntersectionObserver(this._onDrawInIntersection,{threshold:.5}),this._drawInObserver.observe(this))}disconnectedCallback(){this.cancelInteraction(),super.disconnectedCallback(),this._stopDrawIn(),this._stopPreviewMorph(),this._drawInObserver?.disconnect(),this._drawInObserver=null,this._labelResizeObserver?.disconnect(),this._labelResizeObserver=null,window.removeEventListener("blur",this._onWindowBlur),this._mql?.removeEventListener("change",this._onMqlChange),this._mql=null}_getSvgDescription(){if(!this.curves.length)return"No curves displayed";const t=this.curves.map(t=>{const e=t.controlPoints.reduce((t,e)=>Number.isFinite(e.target)?Math.max(t,e.target):t,0);return`${t.friendlyName} (${t.controlPoints.length} points, max ${e}%)`});return`${t.length} curve${1===t.length?"":"s"}: ${t.join(", ")}`}_renderExampleInstruction(){const t=this.curves.findIndex(t=>t.entityId===this.exampleEntityId);if(!this.curves[t]||!this.exampleInstruction)return K;const e=this.exampleCue;if(!e)return K;const i=e.labelAbove??Pt(e.target)-$t>=44,s=i?-1:1,r=this.exampleInstruction,n=r.length*(this._isMobile?8.5:7.5),o=Tt(-27,xt+n+6-this._x(e.lightener),xt+this._plotW-6-this._x(e.lightener)),a=Tt(0,o-n-3,o+3);return V`<g class="example-instruction ${e.pressed?"example-cue-pressed":""}"
      transform="translate(${this._x(e.lightener)} ${Pt(e.target)})" aria-hidden="true">
      <circle class="example-cue-ring" r=${e.pressed?11:15} />
      ${"mouse"===this.exampleInput?V`<path class="example-pointer" transform=${e.lightener>90?"scale(-1 1)":""} d="M 9 8 L 10 27 L 15 22 L 20 30 L 24 28 L 19 20 L 26 19 Z" />`:K}
      <path class="example-cue-leader" d="M ${a>0?11:-11} ${11*s} Q ${a} ${35*s} ${a} ${35*s}" />
      <text class="example-cue-label" x=${o} y=${35*s+(i?0:10)}
        text-anchor="end">${r}</text>
    </g>`}_renderCenteredHintBand(t,e,i,s){const r=xt+this._plotW/2;return V`
      <rect
        class="hint-band"
        x="${r-t/2}"
        y="${i-e/2}"
        width="${t}"
        height="${e}"
        rx="8"
        pointer-events="none"
      />
      ${s}
    `}_syncPreviewMorph(){const t=this.previewCurve?.controlPoints.length?this.previewCurve:null,e=t?`${(i=t).entityId}|${i.controlPoints.map(t=>`${t.lightener}:${t.target}`).join(",")}`:null;var i;if(e===(this._previewShown?.key??null))return void(this._previewMorph&&!Zt(this.joy,"ripple")&&this._stopPreviewMorph());const s=t?this._shownHeights(t.entityId):null;if(this._stopPreviewMorph(),this._previewShown=t&&e?{key:e,curve:t}:null,!t||!s||this.curveFrame||!this.isConnected)return;if(!Zt(this.joy,"ripple"))return;const r=Ni(t.controlPoints);r.every((t,e)=>Math.abs(t-s[e])<.01)||(this._previewMorph={from:s,to:r,progress:0},this._cancelPreviewMorphLoop=Qt(240,t=>{Jt()?this._stopPreviewMorph():this._previewMorph={from:s,to:r,progress:zt(t/240)}},()=>this._stopPreviewMorph()))}_shownHeights(t){const e=this._previewShown?.curve.entityId===t?this._previewShown:null;if(e&&this._previewMorph)return Bi(this._previewMorph);const i=e?.curve??this.curves.find(e=>e.entityId===t);return i?.controlPoints.length?Ni(i.controlPoints):null}_stopPreviewMorph(){this._cancelPreviewMorphLoop?.(),this._cancelPreviewMorphLoop=null,this._previewMorph=null}_renderPreviewCurve(){const t=this.previewCurve;if(!t||!t.controlPoints.length)return K;try{const e=this._previewMorph?Bi(this._previewMorph):null,i=e?function(t){if(t.length<2)return"";let e=`M${t[0].x},${t[0].y}`;for(let i=1;i<t.length;i++)e+=` L${t[i].x},${t[i].y}`;return e}(e.map((t,i)=>({x:this._x(100*i/(e.length-1)),y:Pt(t)}))):Ot(bt(t.controlPoints).map(t=>({x:this._x(t.lightener),y:Pt(t.target)}))),s=this.scrubberPosition,r=null!==s?V`
              <circle
                class="preview-curve-point"
                r="3"
                cx="${this._x(s)}"
                cy="${Pt(e?function(t,e){const i=Tt(e,0,100)/100*(t.length-1),s=Math.min(Math.floor(i),t.length-2);return t[s]+(t[s+1]-t[s])*(i-s)}(e,s):Gt(t.controlPoints,s))}"
              />`:K;return V`
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
      `}catch{return K}}render(){return W`
      <svg
        viewBox="0 0 ${xt+this._plotW+12} ${St}"
        preserveAspectRatio="xMinYMid meet"
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
        ${this.readOnly?K:V`<rect
              class="hit-area"
              x="${xt}"
              y="${$t}"
              width="${this._plotW}"
              height="${kt}"
              pointer-events="all"
              fill="transparent"
              @pointerdown=${this._onHitAreaPointerDown}
              @pointerup=${this._onHitAreaPointerUp}
              @pointercancel=${this._onHitAreaPointerCancel}
            />`}
        ${this.joy.diagonal?V`<line class="diagonal-ref" x1=${this._x(0)} y1=${Pt(0)}
              x2=${this._x(100)} y2=${Pt(100)} pointer-events="none" />`:K}
        <!-- Phase 1: curve fills and lines (rendered before scrubber overlay) -->
        ${(()=>{const t=this._orderedCurves();return V`<g clip-path="url(#graph-area-${this._uid})">${this._renderDrawOut()}${t.map(({curve:t,idx:e})=>this._renderCurvePaths(t,e))}</g>`})()}
        ${this._renderDiagonalFlash()}
        <!-- Scrubber glow filters (only re-render when curves change, not on every position update) -->
        <defs>
          ${this.curves.map(t=>{const e=`scrubber-glow-${t.color.replace("#","")}-${this._uid}`;return V`
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
        ${this.exampleEntityId?V`<desc id="example-${this._uid}">${mt.invitation.description}</desc>`:K}
        ${this._renderScrubberIndicator()} ${this._renderReachDim()}
        <!-- Only the axis strokes rise above Room and reach dimming; the grid stays behind curves. -->
        ${this._renderAxes()} ${this._renderReachBar()} ${this._renderYPill()}
        ${this._renderPreviewCurve()}
        <!-- Phase 3: control points rendered after scrubber overlay so they are always visible -->
        ${(()=>V`<g clip-path="url(#graph-area-${this._uid})">${this.curves.map((t,e)=>this._renderCurvePoints(t,e))}</g>`)()}
        ${this._renderExampleInstruction()}
        ${(()=>{if(this.readOnly)return K;if(0===this.curves.length){const t=112;return this._renderCenteredHintBand(220,32,t,V`<text class="hint hint-select" text-anchor="middle"
                x="${xt+this._plotW/2}" y="${t+4}"
                pointer-events="none"
                >Add a light below to get started</text>`)}return K})()}
      </svg>
    `}}zi.styles=a`
    .example-instruction {
      pointer-events: none;
      animation: invitation-appear ${jt.cueFade}ms ease-out both;
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
    .example-cue-pressed .example-cue-ring {
      opacity: 1;
      stroke-width: 2.5;
    }
    .example-pointer {
      fill: var(--primary-text-color, #212121);
      stroke: var(--card-background-color, #fff);
      stroke-width: 1.5;
      stroke-linejoin: round;
    }
    @media (prefers-reduced-motion: reduce) {
      .example-instruction {
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
      /* Size from the native graph ratio, not the dynamically widened viewBox.
         Removing a pixel cap must resize the box and remeasure the plot. */
      aspect-ratio: ${356} / ${St};
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
      animation: marker-pop ${o(`150ms ${qt}`)} both;
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
        ${o(qt)} forwards;
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
    @media ${ui} {
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
    /* The Room edge: lit to its left, dimmed to its right. */
    .scrubber-line {
      stroke: var(--secondary-text, #616161);
      stroke-width: 1.25;
      opacity: 0.55;
    }
    .scrubber-line.watching {
      stroke: var(--watch-warm, #ffb300);
      opacity: 0.9;
    }
    .scrubber-dot {
      stroke: none;
    }
    .room-edge-hit {
      cursor: ew-resize;
    }
    .reach-bar {
      fill: var(--primary-color, #2563eb);
    }
    /* The pill keeps the labels' native size as the graph grows. */
    .y-pill {
      transform-box: fill-box;
      transform-origin: right center;
      transform: scale(var(--graph-label-scale, 1));
    }
    .y-pill rect {
      fill: var(--primary-color, #2563eb);
    }
    .y-pill text {
      fill: var(--text-primary-color, #fff);
      font-size: 10px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .hero-ring {
      fill: none;
      stroke-width: 1.5;
      opacity: 0.35;
      transform-box: fill-box;
      transform-origin: center;
      transform: scale(var(--graph-label-scale, 1));
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
  `,t([vt({type:Array})],zi.prototype,"curves",void 0),t([vt({type:String})],zi.prototype,"selectedCurveId",void 0),t([vt({type:String})],zi.prototype,"entityId",void 0),t([vt({type:Boolean})],zi.prototype,"readOnly",void 0),t([vt({type:Number})],zi.prototype,"scrubberPosition",void 0),t([vt({type:Boolean})],zi.prototype,"watching",void 0),t([vt({type:Boolean})],zi.prototype,"showXAxisLabel",void 0),t([vt({attribute:!1})],zi.prototype,"previewCurve",void 0),t([vt({attribute:!1})],zi.prototype,"exampleEntityId",void 0),t([vt({attribute:!1})],zi.prototype,"exampleInstruction",void 0),t([vt({type:String})],zi.prototype,"exampleInput",void 0),t([vt({attribute:!1})],zi.prototype,"exampleCue",void 0),t([vt({attribute:!1})],zi.prototype,"joy",void 0),t([vt({attribute:!1})],zi.prototype,"curveFrame",void 0),t([vt({attribute:!1})],zi.prototype,"drawIn",void 0),t([vt({attribute:!1})],zi.prototype,"drawOut",void 0),t([vt({attribute:!1})],zi.prototype,"hoveredCurveId",void 0),t([gt()],zi.prototype,"_dragCurveIdx",void 0),t([gt()],zi.prototype,"_dragPointIdx",void 0),t([gt()],zi.prototype,"_hoveredPoint",void 0),t([gt()],zi.prototype,"_focusedPoint",void 0),t([gt()],zi.prototype,"_isMobile",void 0),t([gt()],zi.prototype,"_labelScale",void 0),t([gt()],zi.prototype,"_settle",void 0),t([gt()],zi.prototype,"_flash",void 0),t([gt()],zi.prototype,"_reveal",void 0),t([gt()],zi.prototype,"_previewMorph",void 0),t([gt()],zi.prototype,"_hero",void 0),t([gt()],zi.prototype,"_plotW",void 0),t([function(t){return(e,i,s)=>((t,e,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof e&&Object.defineProperty(t,e,i),i))(e,i,{get(){return(e=>e.renderRoot?.querySelector(t)??null)(this)}})}("svg")],zi.prototype,"_svgRef",void 0),Ue("curve-graph",zi);const qi=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","PageUp","PageDown"]);class Wi extends ct{constructor(){super(...arguments),this.label="",this.value=0,this.interactionValue=null,this.displayValue="",this.valueText="",this.tooltip="",this.disabled=!1,this.showLabel=!0,this.appearance="bar",this.emphasis=!1,this.contextKey="",this._pointer=null,this._keys=new Set,this._keyContext=null,this._editing=!1,this._edgeWidth=0,this._edgeObserver=null,this._hint=[],this._hintMotionOff=null,this._onWindowBlur=()=>this._finishGesture(),this._onVisibilityChange=()=>{document.hidden&&this._finishGesture()}}get _level(){return Number.isFinite(this.value)?Math.round(Math.max(0,Math.min(100,this.value))):0}get _interactionLevel(){const t=this.interactionValue??this.value;return Number.isFinite(t)?Math.max(0,Math.min(100,t)):0}connectedCallback(){super.connectedCallback(),window.addEventListener("blur",this._onWindowBlur),document.addEventListener("visibilitychange",this._onVisibilityChange)}disconnectedCallback(){this.cancelHint(),this._edgeObserver?.disconnect(),this._edgeObserver=null,this._finishGesture(),window.removeEventListener("blur",this._onWindowBlur),document.removeEventListener("visibilitychange",this._onVisibilityChange),super.disconnectedCallback()}willUpdate(t){t.has("disabled")&&this.disabled||t.has("contextKey")&&(this._pointer||null!==this._keyContext)?this._finishGesture():(t.has("value")||t.has("interactionValue"))&&this._pointer&&!this._pointer.dragging&&(this._pointer.startValue=this._interactionLevel,this._pointer.lastValue=this._interactionLevel)}updated(){"edge"!==this.appearance||this._edgeObserver||"undefined"==typeof ResizeObserver||(this._edgeObserver=new ResizeObserver(([t])=>{this._edgeWidth=t?.contentRect.width??0}),this._edgeObserver.observe(this))}_emit(t){this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0}))}_beginEdit(){this._editing||(this._editing=!0,this._emit("level-start"))}_emitValue(t){this.dispatchEvent(new CustomEvent("level-input",{detail:{value:t},bubbles:!0,composed:!0}))}_finishGesture(){const t=this._pointer,e=this._editing;this._pointer=null,this._editing=!1,this._keys.clear(),this._keyContext=null,t?.dragging&&this.requestUpdate();const i=this.renderRoot.querySelector("input");if(i&&(i.value=String(this._level)),t&&i?.hasPointerCapture?.(t.id))try{i.releasePointerCapture(t.id)}catch(t){if(!(t instanceof DOMException)||"NotFoundError"!==t.name)throw t}e&&this._emit("level-end")}grab(t){this._onPointerDown(t)}playHint(t=0){this.cancelHint();const e=this.renderRoot.querySelector(".marker");if("edge"!==this.appearance||this.disabled||"function"!=typeof e?.animate)return;const i=this._level>50?-12:12,s=t=>({transform:`translate(calc(-50% + ${t}px), -50%)`}),r=getComputedStyle(e).borderTopColor;this._hint=[e.animate([s(0),s(i),s(0),s(i/2),s(0)],{duration:1100,delay:t,easing:"ease-in-out"}),e.animate([{boxShadow:`0 0 0 0 ${r}`},{boxShadow:"0 0 0 10px transparent"}],{duration:1400,delay:t,iterations:2,easing:"ease-out"})];const n=window.matchMedia?.("(prefers-reduced-motion: reduce)");if(!n?.addEventListener)return;const o=()=>{n.matches&&this.cancelHint()};n.addEventListener("change",o),this._hintMotionOff=()=>n.removeEventListener("change",o)}cancelHint(){for(const t of this._hint)t.cancel();this._hint=[],this._hintMotionOff?.(),this._hintMotionOff=null}_onPointerDown(t){if(this.cancelHint(),this.disabled||this._pointer||!t.isPrimary||0!==t.button)return;const e=this.renderRoot.querySelector("input");if(!e)return;const i=e.getBoundingClientRect().width;!Number.isFinite(i)||i<=0||(t.preventDefault(),t.stopPropagation(),this._finishGesture(),e.focus({preventScroll:!0}),!this.disabled&&this.isConnected&&(this._pointer={id:t.pointerId,x:t.clientX,y:t.clientY,width:i,startValue:this._interactionLevel,lastValue:this._interactionLevel,dragging:!1,context:this.contextKey},e.setPointerCapture(t.pointerId)))}_validPointer(t){const e=this._pointer;return e&&e.id===t.pointerId?this.disabled||e.context!==this.contextKey?(this._finishGesture(),null):e:null}_applyPointerValue(t,e){const i=t.clientX===e.x?e.startValue:Math.round(Math.max(0,Math.min(100,e.startValue+100*(t.clientX-e.x)/e.width)));i!==e.lastValue&&(e.lastValue=i,this._beginEdit(),this._pointer!==e||this.disabled||e.context!==this.contextKey?this._finishGesture():this._emitValue(i))}_onPointerMove(t){const e=this._validPointer(t);if(!e)return;const i=Math.abs(t.clientX-e.x),s=Math.abs(t.clientY-e.y);if(!e.dragging){if(s>=6&&s>=i)return void this._finishGesture();if(i<6||i<=s)return;e.dragging=!0,this.requestUpdate()}t.preventDefault(),t.stopPropagation(),this._applyPointerValue(t,e)}_onPointerUp(t){const e=this._validPointer(t);if(!e)return;const i=!e.dragging&&Math.hypot(t.clientX-e.x,t.clientY-e.y)<6;e.dragging&&this._applyPointerValue(t,e),this._finishGesture(),i&&!this.disabled&&e.context===this.contextKey&&this._emit("bar-focus")}_onPointerCancel(t){this._pointer?.id===t.pointerId&&this._finishGesture()}_onKeyDown(t){if(this.cancelHint(),this.disabled)return;if("Enter"===t.key||" "===t.key||"Spacebar"===t.key)return t.preventDefault(),t.stopPropagation(),void(t.repeat||(this._finishGesture(),this._emit("bar-focus")));if(!qi.has(t.key))return;if(t.repeat&&!this._keys.has(t.key))return void t.preventDefault();(this._pointer||null!==this._keyContext&&this._keyContext!==this.contextKey)&&this._finishGesture(),0===this._keys.size&&(t.currentTarget.value=String(Math.round(this._interactionLevel))),this._keyContext=this.contextKey,this._keys.add(t.key);const e=Math.round(this._interactionLevel);e!==this._interactionLevel&&(0===e&&["Home","ArrowLeft","ArrowDown","PageDown"].includes(t.key)||100===e&&["End","ArrowRight","ArrowUp","PageUp"].includes(t.key))&&(t.preventDefault(),this._onInput(t))}_onKeyUp(t){qi.has(t.key)&&(this._keys.delete(t.key),0===this._keys.size&&this._finishGesture())}_onInput(t){t.stopPropagation();const e=t.currentTarget,i=e.valueAsNumber;if(this._pointer)return void(e.value=String(this._level));if(this.disabled||null!==this._keyContext&&this._keyContext!==this.contextKey||!Number.isFinite(i))return e.value=String(this._level),void this._finishGesture();const s=Math.round(Math.max(0,Math.min(100,i)));if(s===this._interactionLevel)return;const r=this.contextKey;this._beginEdit(),this._editing&&!this.disabled&&r===this.contextKey&&this.isConnected?this._emitValue(s):this._finishGesture(),e.value=String(this._level),0===this._keys.size&&this._finishGesture()}_onChange(t){t.stopPropagation(),0!==this._keys.size||this._pointer||this._finishGesture()}_onClick(t){t.preventDefault(),t.stopPropagation()}render(){const t=this._level,e=Number.isFinite(this.value)?Math.max(0,Math.min(100,this.value)):0,i="rail"===this.appearance,s="edge"===this.appearance,r=i?`width: calc((100% - 16px) * ${e/100})`:`width: ${e}%`,n=i?`left: calc(1px + (100% - 16px) * ${e/100})`:s?`left: ${e}%`:`left: clamp(8px, ${e}%, calc(100% - 8px))`,o=this._edgeWidth>0?(100-e)/100*this._edgeWidth>=60:e<=85,a=s?o?`left: calc(${e}% + 23px)`:`right: calc(${100-e}% + 23px)`:K;return W`
      <div
        class="bar ${this.disabled?"disabled":""} ${this._pointer?.dragging?"dragging":""}"
      >
        <span class="fill" aria-hidden="true" style=${r}></span>
        <span class="marker" aria-hidden="true" style=${n}></span>
        <span class="content" aria-hidden="true">
          ${this.showLabel?W`<span class="label"><slot name="label">${this.label}</slot></span>`:K}
          <span class="value" style=${a}>${this.displayValue||`${t}%`}</span>
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
    `}}Wi.styles=a`
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

    /* Edge: the strip stays a full-width, 48px target; only the grip and the
       value next to it are drawn. Owners align the strip to the graph's plot. */
    :host([appearance='edge']) .bar {
      overflow: visible;
      border-radius: 0;
      background: transparent;
    }
    :host([appearance='edge']) .bar:not(.disabled):hover {
      background: transparent;
    }
    :host([appearance='edge']) .bar:has(input:focus-visible) {
      outline: none;
    }
    :host([appearance='edge']) .fill {
      display: none;
    }
    :host([appearance='edge']) .marker {
      top: 50%;
      bottom: auto;
      box-sizing: border-box;
      width: 30px;
      height: 20px;
      border: 1.5px solid
        var(--edge-color, color-mix(in srgb, var(--primary-text-color, #212121) 55%, transparent));
      border-radius: 10px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      opacity: 1;
      transform: translate(-50%, -50%);
      transition:
        transform 120ms ease-out,
        border-color 160ms ease-out;
    }
    :host([appearance='edge']) .marker::before {
      content: '';
      position: absolute;
      inset: 4px 8px;
      background: repeating-linear-gradient(90deg, currentColor 0 1.5px, transparent 1.5px 4px);
      opacity: 0.6;
    }
    :host([appearance='edge']) .bar:not(.disabled):hover .marker,
    :host([appearance='edge']) .dragging .marker {
      transform: translate(-50%, -50%) scale(1.1);
    }
    :host([appearance='edge']) .bar:has(input:focus-visible) .marker {
      outline: 2px solid var(--primary-color, #2563eb);
      outline-offset: 2px;
    }
    :host([appearance='edge']) .content {
      padding: 0;
    }
    :host([appearance='edge']) .value {
      position: absolute;
      top: 50%;
      min-width: 0;
      margin: 0;
      font-size: var(--brightness-bar-font-size, 13px);
      text-align: left;
      transform: translateY(-50%);
    }
    :host([appearance='edge']) input {
      cursor: ew-resize;
    }
    @media (prefers-reduced-motion: reduce) {
      :host([appearance='edge']) .marker {
        transition: none;
      }
    }
  `,t([vt({type:String})],Wi.prototype,"label",void 0),t([vt({type:Number})],Wi.prototype,"value",void 0),t([vt({type:Number})],Wi.prototype,"interactionValue",void 0),t([vt({type:String})],Wi.prototype,"displayValue",void 0),t([vt({type:String})],Wi.prototype,"valueText",void 0),t([vt({type:String})],Wi.prototype,"tooltip",void 0),t([vt({type:Boolean})],Wi.prototype,"disabled",void 0),t([vt({type:Boolean})],Wi.prototype,"showLabel",void 0),t([vt({type:String,reflect:!0})],Wi.prototype,"appearance",void 0),t([vt({type:Boolean,reflect:!0})],Wi.prototype,"emphasis",void 0),t([vt({type:String})],Wi.prototype,"contextKey",void 0),t([gt()],Wi.prototype,"_edgeWidth",void 0),Ue("brightness-bar",Wi);class Vi extends ct{constructor(){super(...arguments),this.curves=[],this.readOnly=!1,this.previewActive=!1,this.watchingDraft=!1,this.canPreview=!1,this.showPreviewToggle=!0,this.example=!1,this.exampleMoving=!1,this.invitation=!1,this.firstUseHints=!1,this.alignToAxis=!1,this.contextKey="",this.position=null,this.interactionPosition=null}_emit(t){this.readOnly&&"scrubber-start"===t||this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0}))}_move(t){if(this.readOnly||!Number.isFinite(t.detail.value))return;const e=Math.min(100,Math.max(0,t.detail.value));this.dispatchEvent(new CustomEvent("scrubber-move",{detail:{position:e},bubbles:!0,composed:!0}))}grab(t){this.readOnly||this.renderRoot.querySelector("brightness-bar")?.grab(t)}playGripHint(t=0){this.readOnly||this.renderRoot.querySelector("brightness-bar")?.playHint(t)}cancelGripHint(){this.renderRoot.querySelector("brightness-bar")?.cancelHint()}_meaning(t){const e=this.curves.length,i=this.curves.filter(e=>Dt(e.controlPoints,t)>0).length;return i===e?mt.scrubber.meaningAll(e):0===i?mt.scrubber.meaningNone(e):mt.scrubber.meaningSome(i,e)}_renderMeaning(t){return this.previewActive?W`<span class="watch-status" role="status"
        ><span class="watch-dot" aria-hidden="true">●</span>${this.watchingDraft?mt.scrubber.watchingHeldStatus:mt.scrubber.meaningFollowing}</span
      >${this.watchingDraft?K:` · ${this._meaning(t)}`}`:this._meaning(t)}_onPreviewToggle(){this.canPreview&&this.dispatchEvent(new CustomEvent("preview-toggle",{bubbles:!0,composed:!0}))}render(){const t=Math.min(100,Math.max(0,this.position??50)),e=0===t?mt.scrubber.off:`${Math.round(t)}%`;return W`
      <div
        class="scrubber-panel ${this.exampleMoving?"demonstrating":""} ${this.alignToAxis?"axis-aligned":""} ${this.previewActive?"watching":""}"
      >
        <brightness-bar
          appearance="edge"
          .label=${mt.scrubber.sliderAria}
          .tooltip=${mt.scrubber.title}
          .value=${t}
          .interactionValue=${this.interactionPosition}
          .displayValue=${e}
          .valueText=${e}
          .showLabel=${!1}
          .disabled=${this.readOnly}
          .contextKey=${this.contextKey}
          @level-start=${()=>this._emit("scrubber-start")}
          @level-input=${this._move}
          @level-end=${()=>this._emit("scrubber-end")}
        ></brightness-bar>
        ${this.canPreview&&this.showPreviewToggle||this.firstUseHints?W`<div class="scrubber-header">
              ${this.firstUseHints?W`<span class="invitation-caption"
                    >${this.invitation?mt.invitation.together:this.example?mt.invitation.example:K}</span
                  >`:K}
              ${this.canPreview&&this.showPreviewToggle?fi(this.previewActive,!1,()=>this._onPreviewToggle()):K}
            </div>`:K}
        ${this.curves.length>0?W`<div class="meaning-row">
              <div class="meaning-line">${this._renderMeaning(t)}</div>
              <slot name="watch"></slot>
            </div>`:K}
      </div>
    `}}Vi.styles=a`
    ${vi}
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
    /* Watch is on: the grip takes the warm colour of the edge above it. */
    .watching brightness-bar {
      --edge-color: var(--watch-warm, #ffb300);
    }
    .demonstrating brightness-bar {
      --edge-color: var(--primary-color, #03a9f4);
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
    /* What the room shows at this position, with the owner's Watch switch at its end. */
    .meaning-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .meaning-line {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 18px;
      color: var(--secondary-text-color, #616161);
      font-size: 12px;
      line-height: 18px;
    }
    .watch-dot {
      margin-right: 4px;
      color: var(--watch-warm, #ffb300);
    }
    ::slotted([slot='watch']) {
      flex: 0 0 auto;
      margin-left: auto;
    }
  `,t([vt({type:Array})],Vi.prototype,"curves",void 0),t([vt({type:Boolean})],Vi.prototype,"readOnly",void 0),t([vt({type:Boolean})],Vi.prototype,"previewActive",void 0),t([vt({type:Boolean})],Vi.prototype,"watchingDraft",void 0),t([vt({type:Boolean})],Vi.prototype,"canPreview",void 0),t([vt({type:Boolean})],Vi.prototype,"showPreviewToggle",void 0),t([vt({type:Boolean})],Vi.prototype,"example",void 0),t([vt({type:Boolean})],Vi.prototype,"exampleMoving",void 0),t([vt({type:Boolean})],Vi.prototype,"invitation",void 0),t([vt({type:Boolean})],Vi.prototype,"firstUseHints",void 0),t([vt({type:Boolean})],Vi.prototype,"alignToAxis",void 0),t([vt({type:String})],Vi.prototype,"contextKey",void 0),t([vt({type:Number})],Vi.prototype,"position",void 0),t([vt({type:Number})],Vi.prototype,"interactionPosition",void 0),Ue("curve-scrubber",Vi);const ji=(t,e,i)=>{const s=new Map;for(let r=e;r<=i;r++)s.set(t[r],r);return s},Ki=Si(class extends Ci{constructor(t){if(super(t),t.type!==ki)throw Error("repeat() can only be used in text expressions")}dt(t,e,i){let s;void 0===i?i=e:void 0!==e&&(s=e);const r=[],n=[];let o=0;for(const e of t)r[o]=s?s(e,o):o,n[o]=i(e,o),o++;return{values:n,keys:r}}render(t,e,i){return this.dt(t,e,i).values}update(t,[e,i,s]){const r=(t=>t._$AH)(t),{values:n,keys:o}=this.dt(e,i,s);if(!Array.isArray(r))return this.ut=o,n;const a=this.ut??=[],h=[];let l,d,c=0,p=r.length-1,u=0,_=n.length-1;for(;c<=p&&u<=_;)if(null===r[c])c++;else if(null===r[p])p--;else if(a[c]===o[u])h[u]=Ri(r[c],n[u]),c++,u++;else if(a[p]===o[_])h[_]=Ri(r[p],n[_]),p--,_--;else if(a[c]===o[_])h[_]=Ri(r[c],n[_]),Ti(t,h[_+1],r[c]),c++,_--;else if(a[p]===o[u])h[u]=Ri(r[p],n[u]),Ti(t,r[c],r[p]),p--,u++;else if(void 0===l&&(l=ji(o,u,_),d=ji(a,c,p)),l.has(a[c]))if(l.has(a[p])){const e=d.get(o[u]),i=void 0!==e?r[e]:null;if(null===i){const e=Ti(t,r[c]);Ri(e,n[u]),h[u]=e}else h[u]=Ri(i,n[u]),Ti(t,r[c],i),r[e]=null;u++}else Di(r[p]),p--;else Di(r[c]),c++;for(;u<=_;){const e=Ti(t,h[_+1]);Ri(e,n[u]),h[u++]=e}for(;c<=p;){const t=r[c++];null!==t&&Di(t)}return this.ut=o,Mi(t,h),j}});function Yi(t){return t.replace(/[ \t\n\r\f]+/g," ").replace(/^ | $/g,"")}class Ji extends ct{constructor(){super(...arguments),this.curves=[],this.selectedCurveId=null,this.exampleEntityId=null,this.scrubberPosition=null,this.editingPosition=null,this.readOnly=!0,this.contextKey="",this.editingCurves=null,this.canManage=!1,this.managing=!1,this.showAllLights=!1,this.hoveredCurveId=null,this.watching=!1,this.watchAck=0,this.watchMotion=!0,this._confirmingDeleteGroup=!1,this._ackedLevels=new Map,this._flickering=new Set,this._wake=!1,this._flickerKey=0,this._pendingManageFocus=null}_focus(t){this.dispatchEvent(new CustomEvent("focus-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_levelIntent(t,e,i){this.dispatchEvent(new CustomEvent(t,{detail:void 0===i?{entityId:e}:{entityId:e,target:i},bubbles:!0,composed:!0}))}_select(t){this.dispatchEvent(new CustomEvent("select-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}willUpdate(t){super.willUpdate(t),!t.has("canManage")&&!t.has("managing")||this.canManage&&!this.managing||(this._confirmingDeleteGroup=!1),this._trackWatch(t)}_roomLevels(){const t=Math.round(this.scrubberPosition??100),e=new Map;for(const i of this.curves)e.set(i.entityId,Math.round(Dt(i.controlPoints,t)));return e}_trackWatch(t){if(!this.watching)return void(t.has("watching")&&(this._ackedLevels=new Map,this._flickering=new Set,this._wake=!1));if(!t.has("watching")&&!t.has("watchAck"))return;const e=this._roomLevels();if(t.has("watching"))return this._ackedLevels=e,this._wake=!0,this._flickering=new Set([...e].filter(([,t])=>t>0).map(([t])=>t)),void this._flickerKey++;const i=new Set;for(const[t,s]of e)this._ackedLevels.get(t)!==s&&i.add(t);this._ackedLevels=e,0!==i.size&&(this._wake=!1,this._flickering=i,this._flickerKey++)}updated(t){super.updated(t);const e=this._pendingManageFocus;this._pendingManageFocus=null,e&&this.renderRoot.querySelector(e)?.focus({preventScroll:!0})}_hover(t,e){"touch"!==e?.pointerType&&this.dispatchEvent(new CustomEvent("hover-curve",{detail:{entityId:t},bubbles:!0,composed:!0}))}_onItemKeyDown(t){if("ArrowDown"===t.key||"ArrowUp"===t.key){t.preventDefault();const e=[...this.renderRoot.querySelectorAll(".row-select-btn")],i=e.indexOf(t.currentTarget),s="ArrowDown"===t.key?i+1:i-1;e[s]?.focus()}}_renderAllLights(){if(!this.showAllLights||0===this.curves.length)return K;const t=null===this.selectedCurveId;return W`<div class="all-lights-row">
      <button
        type="button"
        class="all-lights"
        aria-pressed=${t?"true":"false"}
        @click=${()=>{t||this.dispatchEvent(new CustomEvent("clear-selection",{bubbles:!0,composed:!0}))}}
      >
        ${mt.legend.allLights}
      </button>
    </div>`}render(){const t=this.curves.map(t=>Yi(t.friendlyName)),e=new Map;for(const i of t)e.set(i,(e.get(i)??0)+1);const i=t.map(t=>(e.get(t)??0)>1),s=this.curves.map((t,e)=>i[e]?`${t.friendlyName} (${t.entityId})`:t.friendlyName),r=new Map;for(const t of s){const e=Yi(t);r.set(e,(r.get(e)??0)+1)}const n=new Set(s.map(Yi));for(let t=0;t<s.length;t++)if((r.get(Yi(s[t]))??0)>1){do{s[t]+=` (${this.curves[t].entityId})`}while(n.has(Yi(s[t])));n.add(Yi(s[t]))}const o=0===this.curves.length?mt.legend.emptyCount:"",a=this.curves.length>=20,h=Math.round(this.scrubberPosition??100),l=this.curves.some(t=>t.entityId===this.hoveredCurveId)?this.hoveredCurveId:null;return W`
      <div
        class="legend-panel ${a?"large-group":""}"
        data-density=${a?"large":"normal"}
      >
        ${this._renderManage()}
        <div class="legend-header">
          <div class="legend-label">${mt.legend.title}</div>
          ${o?W`<div class="legend-count" title=${o}>${o}</div>`:K}
        </div>
        ${this._renderAllLights()}
        <div
          class="legend ${l?"has-hover":""} ${this.curves.length>8?"capped":""}"
          role="list"
          aria-label=${mt.legend.listAria(this.curves.length)}
        >
          ${Ki(this.curves,t=>t.entityId,(t,e)=>{const i=s[e],r=Dt(t.controlPoints,h),n=0===r?mt.legend.off:0===Math.round(r)?"<1%":`${Math.round(r)}%`,o=null===this.scrubberPosition?i:`${i} ${n}`,a=this.selectedCurveId===t.entityId,d=l===t.entityId,c=this.editingCurves?.find(e=>e.entityId===t.entityId)??t,p=Math.round(this.editingPosition??h),u=Dt(c.controlPoints,p),_=this.readOnly||0===p,v=`${t.entityId===this.exampleEntityId?"≈ ":""}${n}`;return W`
                <div
                  class="legend-item ${a?"selected":""} ${d?"hovered":""}"
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
                      class="dot-wrap ${this._dotClass(t,r)}"
                      style=${this._haloStyle(r,e)}
                      ><span
                        class="color-dot shape-${Ji._shapes[e%Ji._shapes.length]}"
                        style="background: ${t.color}; --dot-color: ${t.color}"
                      ></span
                    ></span>
                  </button>
                  <brightness-bar
                    appearance="rail"
                    .emphasis=${a||d}
                    .label=${mt.legend.brightnessAria(i)}
                    .value=${Math.round(r)}
                    .interactionValue=${u}
                    .displayValue=${v}
                    .tooltip=${`${t.friendlyName}\n${t.entityId}`}
                    .valueText=${0===h?mt.legend.roomOff:mt.legend.brightnessAt(n,h)}
                    .disabled=${_}
                    .contextKey=${`${this.contextKey}:${t.entityId}:${p}`}
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
                </div>
              `})}
        </div>
      </div>
    `}_dotClass(t,e){if(!this.watching)return"";return`${Math.round(e)>0?"lit":""} ${this.watchMotion&&this._flickering.has(t.entityId)?"flicker-"+(this._flickerKey%2?"b":"a"):""}`}_haloStyle(t,e){if(!this.watching)return"";const i=Math.max(0,Math.min(100,Math.round(t))),s=this._wake?45*e:0;return[`--halo-blur: ${(6+.11*i).toFixed(1)}px`,`--halo-spread: ${(1+i/28).toFixed(1)}px`,`--halo-alpha: ${Math.round(100*(.45+.4*i/100))}%`,`--flicker-delay: ${s}ms`].join("; ")}_renderManage(){return W`
      ${this.managing?W`<div class="managing-row" role="status" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            ${mt.legend.updating}
          </div>`:K}
      ${this._confirmingDeleteGroup&&this.canManage?W`<div class="delete-group-confirm">
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
    `}get confirmingDelete(){return this._confirmingDeleteGroup}startDeleteGroup(){this._startDeleteGroup()}_startDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!0,this._pendingManageFocus=".delete-group-btn.cancel")}_cancelDeleteGroup(){this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("delete-group-dismiss",{bubbles:!0,composed:!0}))}_confirmDeleteGroup(){this.canManage&&!this.managing&&(this._confirmingDeleteGroup=!1,this.dispatchEvent(new CustomEvent("delete-group",{bubbles:!0,composed:!0})))}}Ji.styles=a`
    :host {
      display: block;
      --accent: var(--primary-color, #2563eb);
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .legend-panel {
      position: relative;
      background: transparent;
      /* Up to eight lights stay open. Longer lists scroll inside the list;
         the editor commands stay above it, never below it. */
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
    /* Edit's first row: the whole room, pressed while no light is selected. */
    .all-lights-row {
      padding: 0 0 6px;
    }
    .all-lights {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--secondary-text-color, #616161);
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background 150ms ease;
    }
    .all-lights:hover:not([aria-pressed='true']) {
      background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
    }
    .all-lights[aria-pressed='true'] {
      background: color-mix(in srgb, var(--accent) 9%, transparent);
      color: var(--primary-text-color, #212121);
      cursor: default;
    }
    .all-lights:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .all-lights {
        transition: none;
      }
    }
    @media ${ui} {
      .all-lights {
        min-height: 44px;
      }
    }
    .legend-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color, #616161);
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
    /* Under the graph the lights flow into as many columns as fit, up to six. */
    .legend {
      display: grid;
      grid-template-columns: repeat(
        auto-fill,
        minmax(max(min(100%, 320px), calc((100% - 120px) / 6)), 1fr)
      );
      align-content: start;
      column-gap: 24px;
      overflow: auto;
    }
    .legend.capped {
      max-height: var(--curve-legend-max-height, none);
    }
    .legend-item {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
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
    /* Watch: a warm halo, kept apart from the dot by a ring in the card colour. */
    .dot-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 10px;
      height: 10px;
    }
    .dot-wrap.lit::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      box-shadow:
        0 0 0 2px var(--card-bg, var(--card-background-color, #fff)),
        0 0 var(--halo-blur, 6px) var(--halo-spread, 1px)
          color-mix(in srgb, var(--watch-warm, #ffb300) var(--halo-alpha, 45%), transparent);
      pointer-events: none;
    }
    .dot-wrap .color-dot {
      position: relative;
    }
    .dot-wrap.flicker-a {
      animation: watch-flicker-a ${900}ms ease-out var(--flicker-delay, 0ms) 1 both;
    }
    .dot-wrap.flicker-b {
      animation: watch-flicker-b ${900}ms ease-out var(--flicker-delay, 0ms) 1 both;
    }
    @keyframes watch-flicker-a {
      0%,
      100% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.9);
      }
    }
    @keyframes watch-flicker-b {
      0%,
      100% {
        transform: scale(1);
      }
      35% {
        transform: scale(1.9);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .dot-wrap.flicker-a,
      .dot-wrap.flicker-b {
        animation: none;
      }
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
    brightness-bar {
      grid-column: 2;
      grid-row: 1;
      min-width: 0;
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
    @media ${ui} {
      .legend-item {
        font-size: 14px;
      }
    }
  `,Ji._shapes=Bt,t([vt({type:Array})],Ji.prototype,"curves",void 0),t([vt({type:String})],Ji.prototype,"selectedCurveId",void 0),t([vt({attribute:!1})],Ji.prototype,"exampleEntityId",void 0),t([vt({type:Number})],Ji.prototype,"scrubberPosition",void 0),t([vt({type:Number})],Ji.prototype,"editingPosition",void 0),t([vt({type:Boolean})],Ji.prototype,"readOnly",void 0),t([vt({type:String})],Ji.prototype,"contextKey",void 0),t([vt({attribute:!1})],Ji.prototype,"editingCurves",void 0),t([vt({type:Boolean})],Ji.prototype,"canManage",void 0),t([vt({type:Boolean})],Ji.prototype,"managing",void 0),t([vt({type:Boolean})],Ji.prototype,"showAllLights",void 0),t([vt({attribute:!1})],Ji.prototype,"hoveredCurveId",void 0),t([vt({type:Boolean})],Ji.prototype,"watching",void 0),t([vt({type:Number})],Ji.prototype,"watchAck",void 0),t([vt({type:Boolean})],Ji.prototype,"watchMotion",void 0),t([gt()],Ji.prototype,"_confirmingDeleteGroup",void 0),t([gt()],Ji.prototype,"_flickering",void 0),t([gt()],Ji.prototype,"_wake",void 0),t([gt()],Ji.prototype,"_flickerKey",void 0),Ue("curve-legend",Ji);class Xi extends ct{constructor(){super(...arguments),this.variant="commit",this.dirty=!1,this.saving=!1,this.animating=!1,this.canUndo=!1,this.saveDisabled=!1}_onSave(){this.dispatchEvent(new CustomEvent("save-curves",{bubbles:!0,composed:!0}))}_onCancel(){this.dispatchEvent(new CustomEvent("cancel-curves",{bubbles:!0,composed:!0}))}_onUndo(){this.dispatchEvent(new CustomEvent("undo-curves",{bubbles:!0,composed:!0}))}render(){return"undo"===this.variant?W`<div class="footer">
        <button
          type="button"
          class="btn-undo"
          @click=${this._onUndo}
          ?disabled=${this.saving||!this.canUndo}
          aria-label="Undo"
        >
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 14 4 9l5-5"></path>
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"></path>
          </svg>
          <span class="label">${mt.footer.undo}</span>
        </button>
      </div>`:W`
      <div class="footer">
        <button
          type="button"
          class="btn-cancel"
          @click=${this._onCancel}
          ?disabled=${this.saving||this.animating}
          aria-label="Cancel changes"
        >
          ${mt.footer.cancel}
        </button>
        <button
          type="button"
          class="btn-save"
          @click=${this._onSave}
          ?disabled=${this.saving||this.animating||this.saveDisabled||!this.dirty}
          aria-label="Save changes (Ctrl+S)"
        >
          ${this.saving?W`<span class="spinner" aria-hidden="true"></span
                ><span class="sr-only">${mt.footer.saving}</span>`:mt.footer.save}
        </button>
      </div>
    `}}Xi.styles=a`
    :host {
      display: block;
      --divider: var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      white-space: nowrap;
    }
    button {
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition:
        background 150ms ease,
        opacity 150ms ease;
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    button:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
    /* Save is the one filled blue command; never the theme's accent. */
    .btn-save {
      min-width: 84px;
      border: 1px solid #2563eb;
      background: #2563eb;
      color: #fff;
    }
    .btn-save:hover:not(:disabled) {
      background: color-mix(in srgb, #2563eb 88%, #000);
    }
    .btn-cancel {
      border: 1px solid var(--divider);
      background: transparent;
      color: var(--primary-text-color, #212121);
    }
    .btn-cancel:hover:not(:disabled),
    .btn-undo:hover:not(:disabled) {
      background: color-mix(in srgb, var(--primary-text-color, #212121) 6%, transparent);
    }
    .btn-undo {
      padding: 0 10px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--primary-text-color, #212121);
    }
    .icon {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
    }
    /* Saving swaps the label for a spinner inside the same footprint. */
    .spinner {
      width: 14px;
      height: 14px;
      flex: 0 0 14px;
      box-sizing: border-box;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
      .spinner {
        animation: none;
      }
    }
    @media ${ui} {
      button {
        min-height: 44px;
      }
    }
  `,t([vt({type:String})],Xi.prototype,"variant",void 0),t([vt({type:Boolean})],Xi.prototype,"dirty",void 0),t([vt({type:Boolean})],Xi.prototype,"saving",void 0),t([vt({type:Boolean})],Xi.prototype,"animating",void 0),t([vt({type:Boolean})],Xi.prototype,"canUndo",void 0),t([vt({type:Boolean})],Xi.prototype,"saveDisabled",void 0),Ue("curve-footer",Xi);const Zi="[Lightener] Unsupported or malformed candidate_state_metadata. Expected v1 with boolean hidden, disabled, and missing on every light; using the legacy all-visible view.";function Qi(t){return"object"==typeof t&&null!==t&&!Array.isArray(t)}function ts(t){return"string"==typeof t?t:null}function es(t,e){if(!Qi(t))throw new Error(`Invalid candidate response: lights[${e}] must be an object`);const i=function(t,e){if("string"!=typeof t)throw new Error(`Invalid candidate response: ${e} must be a string`);return t}(t.entity_id,`lights[${e}].entity_id`);return{entity_id:i,name:"string"==typeof t.name?t.name:i,available:"boolean"==typeof t.available&&t.available,area_id:ts(t.area_id),area_name:ts(t.area_name)}}function is(t){if(!Qi(t))throw new Error("Invalid candidate response: expected an object");if(!Array.isArray(t.observed_controlled_entity_ids))throw new Error("Invalid candidate response: observed_controlled_entity_ids must be an array");if(!t.observed_controlled_entity_ids.every(t=>"string"==typeof t))throw new Error("Invalid candidate response: observed_controlled_entity_ids must contain strings");if(!Array.isArray(t.lights))throw new Error("Invalid candidate response: lights must be an array");const e=t.lights,i=e.map(es),s=t.capabilities;let r="legacy",n=null;if(void 0!==s)if(Qi(s)){if(o=s,a="candidate_state_metadata",Object.prototype.hasOwnProperty.call(o,a))if(1!==s.candidate_state_metadata)n=Zi;else{e.every(t=>Qi(t)&&"boolean"==typeof t.hidden&&"boolean"==typeof t.disabled&&"boolean"==typeof t.missing)?r="v1":n=Zi}}else n=Zi;var o,a;const h=i.map((t,i)=>{if("legacy"===r)return{...t,hidden:!1,disabled:!1,missing:!1};const s=e[i];return{...t,hidden:s.hidden,disabled:s.disabled,missing:s.missing}});return{observedControlledEntityIds:[...t.observed_controlled_entity_ids],lights:h,metadataMode:r,metadataWarning:n}}class ss extends ct{constructor(){super(...arguments),this.hass=null,this.groupEntityId="",this.beginApply=null,this._lights=[],this._observedOrder=[],this._pendingSelectedIds=new Set,this._metadataMode="legacy",this._search="",this._areaId="",this._currentGroupOnly=!1,this._showExceptional=!1,this._loading=!0,this._applying=!1,this._loadError=null,this._applyError=null,this._applyErrorCode=null,this._announcedResultSummary="",this._initialMemberIds=new Set,this._candidateOrder=[],this._loadInFlight=!1,this._loaded=!1,this._loadSerial=0,this._metadataWarningEmitted=!1,this._resultAnnouncementTimer=null,this._areaOptions=[],this._boundKeydown=t=>this._onKeydown(t)}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this._boundKeydown),this.hasUpdated&&this._loadIfReady()}disconnectedCallback(){this._loadSerial+=1,this._loadInFlight=!1,this._loaded||(this._loading=!1),this._clearResultAnnouncementTimer(),document.removeEventListener("keydown",this._boundKeydown),super.disconnectedCallback()}firstUpdated(){const t=this.renderRoot.querySelector(".load-error");if(t)return void t.focus();const e=this.renderRoot.querySelector("#membership-search");e&&!e.disabled?e.focus():this.renderRoot.querySelector("#membership-title")?.focus()}willUpdate(t){const e=t.has("groupEntityId")&&t.get("groupEntityId")!==this.groupEntityId,i=t.has("hass")&&!this.hass||t.has("groupEntityId")&&!this.groupEntityId;(e||i)&&this._resetForGroup()}updated(t){(t.has("hass")||t.has("groupEntityId"))&&this._loadIfReady(),(t.has("_lights")||t.has("_pendingSelectedIds")||t.has("_search")||t.has("_areaId")||t.has("_currentGroupOnly")||t.has("_showExceptional")||t.has("_loaded")||t.has("_loadError"))&&this._scheduleResultAnnouncement()}_resetForGroup(){this._loadSerial+=1,this._loadInFlight=!1,this._loaded=!1,this._lights=[],this._observedOrder=[],this._initialMemberIds=new Set,this._pendingSelectedIds=new Set,this._candidateOrder=[],this._areaOptions=[],this._metadataMode="legacy",this._search="",this._areaId="",this._currentGroupOnly=!1,this._showExceptional=!1,this._loading=!0,this._applying=!1,this._loadError=null,this._applyError=null,this._applyErrorCode=null,this._announcedResultSummary="",this._clearResultAnnouncementTimer(),this.hass&&this.groupEntityId||(this._loading=!1)}_loadIfReady(){this.isConnected&&this.hass&&this.groupEntityId&&!this._loadInFlight&&!this._loaded&&!this._loadError&&this._load()}async _load(){if(!this.hass||!this.groupEntityId||this._loadInFlight)return;const t=this.hass,e=this.groupEntityId,i=++this._loadSerial;this._loadInFlight=!0,this._loading=!0,this._loadError=null,this._applyError=null,this._applyErrorCode=null;try{let s,r;try{s=await t.callWS({type:"lightener/list_candidate_lights",entity_id:e})}catch(t){return void(i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"request"))}if(i!==this._loadSerial||e!==this.groupEntityId)return;try{r=is(s)}catch(t){return void(i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"response"))}r.metadataWarning&&!this._metadataWarningEmitted&&(this._metadataWarningEmitted=!0,console.warn(r.metadataWarning)),this._initialMemberIds=new Set(r.observedControlledEntityIds),this._candidateOrder=r.lights.map(t=>t.entity_id),this._lights=function(t,e,i){const s=new Intl.Collator(i,{sensitivity:"base",numeric:!0});return[...t].sort((t,i)=>{const r=e.has(t.entity_id);return r!==e.has(i.entity_id)?r?-1:1:s.compare(t.name,i.name)||s.compare(t.entity_id,i.entity_id)})}(r.lights,this._initialMemberIds,t.locale?.language),this._observedOrder=r.observedControlledEntityIds,this._pendingSelectedIds=new Set(r.observedControlledEntityIds),this._metadataMode=r.metadataMode,this._rebuildAreaOptions(),this._loaded=!0,this._loadError=null,this._loading=!1,this._afterNextRender("focus the loaded membership dialog",()=>{if(i!==this._loadSerial||e!==this.groupEntityId)return;const t=this.renderRoot.querySelector("#membership-title"),s=this.shadowRoot?.activeElement??null;null!==s&&s!==t||this._focusOrHeading(this.renderRoot.querySelector("#membership-search"))})}catch(t){i===this._loadSerial&&e===this.groupEntityId&&this._setLoadFailure(t,"process")}finally{i===this._loadSerial&&(this._loadInFlight=!1,this._loading=!1)}}_setLoadFailure(t,e){console.error(`[Lightener] Failed to ${e} candidate lights:`,t),this._loaded=!1,this._loadError=mt.membership.loadError,this._loading=!1,this._afterNextRender("focus the membership load error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".load-error"))})}_afterNextRender(t,e){this.updateComplete.then(e).catch(e=>{console.error(`[Lightener] Failed to ${t}:`,e)})}_retryLoad(){this._loadInFlight||this._applying||!this._loadError||(this._loaded=!1,this._loadError=null,this._loadIfReady())}_errorMessage(t,e){const i=t;return"conflict"===i?.code?mt.membership.conflictError:"disabled_entity"===i?.code?mt.membership.disabledError:"reload_failed"===i?.code?mt.membership.reloadError:"rollback_reload_failed"===i?.code?mt.membership.rollbackError:"preview_active"===i?.code?mt.restoration.membershipBlocked:e}get _groupName(){return this.hass?.states[this.groupEntityId]?.attributes.friendly_name??this.groupEntityId}_isExceptional(t){return"v1"===this._metadataMode&&(t.hidden||t.disabled)}_matchesSearchAndArea(t,e){return(!this._areaId||t.area_id===this._areaId)&&!(e&&!t.name.toLocaleLowerCase().includes(e)&&!t.entity_id.toLocaleLowerCase().includes(e))}_matchesScopeAndDiscovery(t,e){return(!this._currentGroupOnly||this._initialMemberIds.has(t.entity_id))&&this._matchesSearchAndArea(t,e)}_isSuppressedExceptional(t){return this._isExceptional(t)&&!this._initialMemberIds.has(t.entity_id)&&!this._pendingSelectedIds.has(t.entity_id)}_computeView(){const t=this._search.trim().toLocaleLowerCase(),e=[];let i=0,s=0;for(const r of this._lights){if(!this._matchesScopeAndDiscovery(r,t))continue;const n=this._isSuppressedExceptional(r);n&&(s+=1),!this._showExceptional&&n||(e.push(r),this._pendingSelectedIds.has(r.entity_id)&&(i+=1))}return{visible:e,visibleSelected:i,exceptionalCount:s}}get _areas(){return this._areaOptions}_rebuildAreaOptions(){const t=new Map;for(const e of this._lights)e.area_id&&e.area_name&&t.set(e.area_id,e.area_name);const e=new Intl.Collator(this.hass?.locale?.language,{sensitivity:"base"});this._areaOptions=[...t].map(([t,e])=>({id:t,name:e})).sort((t,i)=>e.compare(t.name,i.name))}get _hasChanges(){return this._pendingSelectedIds.size!==this._observedOrder.length||this._observedOrder.some(t=>!this._pendingSelectedIds.has(t))}get _applyBlockedByConflict(){return"conflict"===this._applyErrorCode}_statuses(t){const e=[];return t.hidden&&e.push(mt.membership.hidden),t.disabled&&e.push(mt.membership.disabled),t.missing?e.push(mt.membership.missing):t.available||t.disabled||e.push(mt.membership.unavailable),e}_isNewDisabled(t){return t.disabled&&!this._initialMemberIds.has(t.entity_id)}_toggle(t){if(this._applying||this._isNewDisabled(t))return;const e=new Set(this._pendingSelectedIds),i=e.has(t.entity_id);i?e.delete(t.entity_id):e.add(t.entity_id);const s=i&&!this._showExceptional&&this._isExceptional(t)&&!this._initialMemberIds.has(t.entity_id);this._pendingSelectedIds=e,this._applyBlockedByConflict||(this._applyError=null,this._applyErrorCode=null),s&&this._afterNextRender("restore focus after hiding an exceptional light",()=>{this._focusOrHeading(this.renderRoot.querySelector(".exceptional-filter"))})}_clearSearchAndArea(){this._search="",this._areaId="",this._afterNextRender("restore focus after clearing membership filters",()=>{this._focusOrHeading(this.renderRoot.querySelector("#membership-search"))})}_showAllLights(){this._currentGroupOnly=!1,this._afterNextRender("restore focus after showing all lights",()=>{this._focusOrHeading(this.renderRoot.querySelector(".light-row input:not(:disabled)"))})}_revealExceptional(){const t=this._search.trim().toLocaleLowerCase(),e=this._lights.find(e=>this._matchesScopeAndDiscovery(e,t)&&this._isSuppressedExceptional(e))?.entity_id;this._showExceptional=!0,this._afterNextRender("restore focus after revealing exceptional lights",()=>{const t=e?[...this.renderRoot.querySelectorAll("input[data-entity-id]")].find(t=>t.dataset.entityId===e&&!t.disabled):null;this._focusOrHeading(t??null)})}_focusOrHeading(t){t&&!t.matches(":disabled")&&(t.focus(),this.shadowRoot?.activeElement===t)||this.renderRoot.querySelector("#membership-title")?.focus()}_clearResultAnnouncementTimer(){null!==this._resultAnnouncementTimer&&(clearTimeout(this._resultAnnouncementTimer),this._resultAnnouncementTimer=null)}_scheduleResultAnnouncement(){if(this._clearResultAnnouncementTimer(),!this._loaded||this._loadError)return void(this._announcedResultSummary="");const{visible:t,visibleSelected:e}=this._computeView(),i=mt.membership.resultSummary(t.length,e,this._pendingSelectedIds.size);this._resultAnnouncementTimer=setTimeout(()=>{this._resultAnnouncementTimer=null,this.isConnected&&this._loaded&&!this._loadError&&(this._announcedResultSummary=i)},ss.RESULT_ANNOUNCEMENT_DELAY_MS)}_close(){this._applying||this.dispatchEvent(new CustomEvent("membership-close",{bubbles:!0,composed:!0}))}async _apply(){if(!this.hass||!this.groupEntityId||this._applying||this._loading||this._applyBlockedByConflict)return;if(0===this._pendingSelectedIds.size)return this._applyError=mt.membership.emptyError,void this._afterNextRender("focus the empty membership error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".apply-error"))});if(!this._hasChanges)return;this._applying=!0,this._applyError=null,this._applyErrorCode=null;const t=this.groupEntityId,e=this.hass.user.id,i=this._loadSerial;let s=!1,r=null,n=!1;try{const s=new Set(this._observedOrder),o=this._observedOrder.filter(t=>this._pendingSelectedIds.has(t));if(o.push(...this._candidateOrder.filter(t=>this._pendingSelectedIds.has(t)&&!s.has(t))),this.beginApply&&(r=this.beginApply([...this._observedOrder,...o]),!r))throw{code:"preview_active"};const a=await this.hass.callWS({type:"lightener/set_controlled_lights",entity_id:this.groupEntityId,controlled_entity_ids:o,observed_controlled_entity_ids:this._observedOrder});if(n=!!a&&!!a.entities&&Array.isArray(a.added_entity_ids)&&Array.isArray(a.removed_entity_ids),r&&!n)throw new Error(mt.membership.applyError);if(!this.isConnected||t!==this.groupEntityId||e!==this.hass?.user.id||i!==this._loadSerial)return;this.dispatchEvent(new CustomEvent("membership-applied",{detail:a,bubbles:!0,composed:!0}))}catch(t){s=!0,this._applyErrorCode="string"==typeof t?.code?t.code??null:null,this._applyError=this._errorMessage(t,mt.membership.applyError),n=new Set(["empty_selection","too_many","duplicate","self_reference","not_a_light","recursive_lightener","disabled_entity","conflict","invalid_format","unauthorized"]).has(this._applyErrorCode??"")}finally{n&&r?.(),this._applying=!1}s&&this._afterNextRender("focus the membership update error",()=>{this._focusOrHeading(this.renderRoot.querySelector(".apply-error"))})}_onKeydown(t){if("Escape"===t.key)return void(this._applying||(t.preventDefault(),t.stopPropagation(),this._close()));if("Tab"!==t.key)return;const e=[...this.renderRoot.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")];if(0===e.length)return t.preventDefault(),void this.renderRoot.querySelector("#membership-title")?.focus();const i=e[0],s=e[e.length-1],r=this.shadowRoot?.activeElement??null;e.includes(r)?t.shiftKey&&r===i?(t.preventDefault(),s.focus()):t.shiftKey||r!==s||(t.preventDefault(),i.focus()):(t.preventDefault(),(t.shiftKey?s:i).focus())}_renderEmptyState(t){if(0===this._lights.length)return W`<div class="state-message">
        <div class="empty-copy">${mt.membership.sourceEmpty}</div>
      </div>`;const e=this._showExceptional?0:t.exceptionalCount;return e>0?W`<div class="state-message">
        <div class="empty-copy">${mt.membership.exceptionalEmpty(e)}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._revealExceptional}
        >
          ${mt.membership.showExceptionalAction}
        </button>
      </div>`:this._search.trim()||this._areaId?W`<div class="state-message">
        <div class="empty-copy">${mt.membership.filterEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._clearSearchAndArea}
        >
          ${mt.membership.clearFilters}
        </button>
      </div>`:this._currentGroupOnly?W`<div class="state-message">
        <div class="empty-copy">${mt.membership.scopeEmpty}</div>
        <button
          class="action"
          type="button"
          ?disabled=${this._applying}
          @click=${this._showAllLights}
        >
          ${mt.membership.showAllLights}
        </button>
      </div>`:W`<div class="state-message">
      <div class="empty-copy">${mt.membership.filterEmpty}</div>
    </div>`}_renderList(t){if(this._loading)return W`<div class="state-message" role="status" aria-live="polite">
        <div class="loading-copy">${mt.membership.loading}</div>
        <div class="skeletons" aria-hidden="true">
          <div class="skeleton"></div>
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        </div>
      </div>`;if(this._loadError)return W`<div class="state-message">
        <div class="error load-error" role="alert" aria-live="assertive" tabindex="-1">
          ${this._loadError}
        </div>
        <button class="action" type="button" @click=${this._retryLoad}>
          ${mt.membership.tryAgain}
        </button>
      </div>`;const{visible:e}=t;return 0===e.length?this._renderEmptyState(t):W`${Ki(e,t=>t.entity_id,t=>{const e=this._statuses(t),i=`membership-light-meta-${t.entity_id.replace(/[^a-zA-Z0-9_-]/g,"-")}`,s=this._isNewDisabled(t);return W`
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
            ${t.area_name?W`<span class="area">${t.area_name}</span>`:K}
          </label>
        `})}`}render(){const t=this._computeView(),{visible:e,visibleSelected:i}=t,s=this._loading||this._applying||!this._loaded,r=this._loaded&&0===this._pendingSelectedIds.size;return W`
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
                ${this._areas.map(t=>W`<option value=${t.id}>${t.name}</option>`)}
              </select>
            </label>
          </div>

          <div class="scope-filters">
            ${this._loaded?W`<label class="scope-option">
                  <input
                    class="current-group-filter"
                    type="checkbox"
                    .checked=${this._currentGroupOnly}
                    ?disabled=${s}
                    @change=${t=>{this._currentGroupOnly=t.target.checked}}
                  />
                  <span>${mt.membership.currentGroupOnly(this._initialMemberIds.size)}</span>
                </label>`:K}
            ${this._loaded&&"v1"===this._metadataMode?W`<label class="scope-option">
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

          ${this._loaded&&!this._loadError?W`<div class="result-summary">
                  ${mt.membership.resultSummary(e.length,i,this._pendingSelectedIds.size)}
                </div>
                <span
                  class="sr-only result-announcement"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  >${this._announcedResultSummary}</span
                >`:W`<div class="result-summary" aria-hidden="true"></div>`}
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
          ${this._applyError?W`<div class="error apply-error" role="alert" aria-live="assertive" tabindex="-1">
                ${this._applyError}
              </div>`:r?W`<div class="error selection-error" role="status">
                  ${mt.membership.emptyError}
                </div>`:K}
          ${this._applying?W`<span class="sr-only applying-status" role="status" aria-live="polite"
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
    `}}ss.RESULT_ANNOUNCEMENT_DELAY_MS=250,ss.styles=a`
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
      font-weight: 600;
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
  `,t([vt({attribute:!1})],ss.prototype,"hass",void 0),t([vt({type:String})],ss.prototype,"groupEntityId",void 0),t([vt({attribute:!1})],ss.prototype,"beginApply",void 0),t([gt()],ss.prototype,"_lights",void 0),t([gt()],ss.prototype,"_observedOrder",void 0),t([gt()],ss.prototype,"_pendingSelectedIds",void 0),t([gt()],ss.prototype,"_metadataMode",void 0),t([gt()],ss.prototype,"_search",void 0),t([gt()],ss.prototype,"_areaId",void 0),t([gt()],ss.prototype,"_currentGroupOnly",void 0),t([gt()],ss.prototype,"_showExceptional",void 0),t([gt()],ss.prototype,"_loading",void 0),t([gt()],ss.prototype,"_applying",void 0),t([gt()],ss.prototype,"_loadError",void 0),t([gt()],ss.prototype,"_applyError",void 0),t([gt()],ss.prototype,"_applyErrorCode",void 0),t([gt()],ss.prototype,"_announcedResultSummary",void 0),Ue("light-membership-dialog",ss);class rs extends Error{}const ns=new WeakMap;"undefined"!=typeof window&&(function(){const t=globalThis.CSS;if(t?.registerProperty)try{t.registerProperty({name:"--curve-graph-max-height",syntax:"<length-percentage>",inherits:!0,initialValue:"520px"})}catch{}}(),window.__LIGHTENER_CURVE_CARD_VERSION__="2.18.0",function(t,e){if(void 0===t.customCards&&(t.customCards=[]),!Array.isArray(t.customCards))return;const i=t.customCards;i.some(t=>t?.type===e.type)||i.push(e)}(window,{type:He,name:"Lightener Studio",description:"Shape how each light responds to group brightness.",documentationURL:"https://github.com/florianhorner/lightener-studio#readme",preview:!0,getEntitySuggestion:function(t,e){return Fe(t,e)?{config:{type:Oe,entity:e}}:null}}));const os=W`<svg
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
</svg>`,as=W`<svg
  class="exit-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M5 12.5l4.5 4.5L19 7.5"></path>
</svg>`,hs=W`<svg
  class="exit-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M12 20h9"></path>
  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
</svg>`;const ls=["light"];class ds extends ct{constructor(){super(...arguments),this._config={},this._hass=null,this._picker=new Ne(()=>this.isConnected,()=>this.requestUpdate())}connectedCallback(){super.connectedCallback(),this._picker.ensureLoaded()}setConfig(t){this._config=t,this._picker.ensureLoaded()}set hass(t){this._hass=t,this._picker.ensureLoaded()}_fireConfigChanged(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}_commitConfigKey(t,e){const i=Object.fromEntries(Object.entries(this._config).filter(([e])=>e!==t));this._config=e?{...i,[t]:e}:i,this._fireConfigChanged()}_onEntityChange(t){this._commitConfigKey("entity",t.detail?.value??"")}_onTitleChange(t){this._commitConfigKey("title",t.target.value)}_onFallbackEntityInput(t){this._commitConfigKey("entity",t.target.value.trim())}render(){const t=this._config.entity??"",e=this._config.title??"",i=this._hass?function(t){const e=t.entities;return e?Object.keys(e).filter(e=>Fe(t,e)):[]}(this._hass):[];return W`
      <div class="form">
        <div class="field">
          <label>Entity</label>
          ${function(t){return t.ready?W`<ha-entity-picker
      .hass=${t.hass}
      .value=${t.value}
      .includeDomains=${t.includeDomains}
      .includeEntities=${t.includeEntities}
      .excludeEntities=${t.excludeEntities??[]}
      allow-custom-entity
      aria-label=${t.ariaLabel??K}
      @value-changed=${t.onValueChanged}
    ></ha-entity-picker>`:"change"===(t.fallbackEvent??"input")?W`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??K}
        aria-label=${t.ariaLabel??K}
        @change=${t.onFallbackInput}
      />`:W`<input
        type="text"
        .value=${t.value}
        placeholder=${t.placeholder??K}
        aria-label=${t.ariaLabel??K}
        @input=${t.onFallbackInput}
      />`}({ready:this._picker.ready,hass:this._hass,value:t,includeDomains:ls,includeEntities:i.length?i:void 0,placeholder:"light.your_lightener_group",fallbackEvent:"change",onValueChanged:this._onEntityChange,onFallbackInput:this._onFallbackEntityInput})}
          ${this._picker.ready?W`<span class="hint"
                >Only Lightener groups are listed — pick one to shape its lights.</span
              >`:W`<span class="hint">
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
    `}}ds.styles=a`
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
      font-weight: 600;
      color: var(--secondary-text-color, #616161);
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
  `,t([gt()],ds.prototype,"_config",void 0),t([gt()],ds.prototype,"_hass",void 0),Ue("lightener-curve-card-editor",ds);class cs extends ct{constructor(){super(...arguments),this.experimentalFirstUse=!1,this.canvasHelp=!1,this.canCreateGroup=!1,this._canvasHelpNotice=null,this._canvasHelpNoticeTimer=null,this._invitation=new De(()=>{this._invitation.curve&&"complete"===this._invitation.phase&&this._restoreInvitationSelection(),this._invitationFrame=!0,this.requestUpdate()}),this._invitationFrame=!1,this._invitationFromView=!1,this._invitationAutoAllowed=!1,this._invitationVisible=!1,this._invitationGraph=null,this._invitationObserver=null,this._invitationStartTimer=null,this._invitationMotionUnsubscribe=null,this._invitationInput="mouse",this._invitationHintTimer=null,this._invitationEditHint=null,this._invitationTogether=!1,this._curves=[],this._originalCurves=[],this._config={},this._selectedCurveId=null,this._editRequested=!1,this._editLayoutHeld=!1,this._editRequests=0,this._sessionStateInitialized=!1,this._saveState=wi,this.draftSurface="dashboard",this._draftPrincipal=null,this._identityAvailable=!1,this._draftOwner=crypto.randomUUID(),this._draftClaim=null,this._claimedScope=null,this._resumeTicket=null,this._draftUnsubscribe=null,this._knownEntryId=null,this._suppressDraftCapture=!1,this._writeReview={kind:"live"},this._draftLost=!1,this._savedRead=null,this._draftNotice=null,this._resumeUnverified=!1,this._authInvalidated=!1,this._resumePayload=null,this._verifyAfterDiscard=!1,this._pendingRecoveryClaim=null,this._draftSubscriptionKey="",this._pendingDraftWrite=null,this._retainedReview=null,this._identityUnavailableRuntimeEntries=new Set,this._contextGeneration=0,this._loadGeneration=0,this._recoveryGeneration=0,this._baseline=null,this._rawBaseline=null,this._membershipBaseline=null,this._submittedIntent=null,this._saveIssue=null,this._saveReview=null,this._load=$i,this._manageError=null,this._managingLights=!1,this._groupDeleted=!1,this._scrubberPosition=null,this._cancelAnimating=!1,this._joy=Vt,this._drawIn=null,this._drawInToken=0,this._drawInTimer=null,this._drawInWaitingForVisible=!1,this._unsubscribeDrawInMotion=null,this._boundStopDrawIn=t=>{"pointerdown"===t?.type&&this._drawInWaitingForVisible||this._stopDrawIn()},this._drawOut=null,this._drawOutToken=0,this._drawOutTimer=null,this._ripple=null,this._cancelRippleLoop=null,this._morphLine=null,this._hass=null,this._undoStack=[],this._editGesture=null,this._narrowLayout=!1,this.toolbarHost=null,this._activeToolbarHost=null,this._pendingCommandFocus=null,this._commandFocusVersion=0,this._onToolbarInteraction=t=>{t.isTrusted&&this._coach.interrupt()},this._layoutObserver=null,this._layoutNodes=[],this._pendingNarrowLayout=null,this._boundKeyHandler=null,this._boundBeforeUnload=null,this._boundLayoutSync=null,this._layoutFrame=null,this._saveGuard=new xi({dispatchSave:t=>this._dispatchSave(t),getSavePhase:()=>this._saveState.phase}),this._cancelAnimFrame=null,this._curveAnimationGeneration=0,this._previewActive=!1,this._watchAck=0,this._watchHintDismissed=function(){if(mi)return!0;try{return null!==localStorage.getItem(gi)}catch{return!1}}(),this._watchHintTimer=null,this._hoveredCurveId=null,this._presetGraphTrial=null,this._pendingPresetGraphTrial=null,this._hoveredPresetGraphTrial=null,this._focusedPresetGraphTrial=null,this._membershipOpen=!1,this._moreOpen=!1,this._membershipStatus=null,this._membershipStatusTimer=null,this._coach=new pi({isReady:()=>this._load.loaded&&void 0!==this._selectedCurve,setTrial:t=>this._setPresetGraphTrial(t),clearTrial:()=>this._clearPresetGraphTrial(),requestUpdate:()=>this.requestUpdate()}),this._lastPresetPointerType=null,this._previewController=new di({getHass:()=>this._authInvalidated?null:this._hass,canDispatch:()=>this.isConnected&&this._isAdmin&&!this._runtimeBlocked&&!this._authInvalidated,restoreBlocked:(t,e)=>{const i=this._draftPrincipal;return!i||`${i.origin}/${i.userId}`!==e||!ni.isCurrent(i)||this._identityUnavailableRuntimeEntries.has(t)||ni.isRuntimeBlocked(i,t)},restorationChanged:()=>this.requestUpdate(),getCurves:()=>this._curves,getScrubberPosition:()=>this._effectiveScrubberPosition,setScrubberPosition:t=>{this._scrubberPosition=t},getStorageEntityId:()=>this._storageEntityId,getConfigEntryId:()=>this._knownEntryId??this._baseline?.config_entry_id,persistScrubberPosition:(t,e)=>{this._writeStoredState(t,{scrubberPosition:e})},setPreviewActive:t=>{this._previewActive=t}}),this._lastEmittedDirtyState=!1,this._dirtyVersion=0,this._cleanVersion=0,this._releaseEditLayout=()=>{window.removeEventListener("pointerup",this._releaseEditLayout,!0),window.removeEventListener("pointercancel",this._releaseEditLayout,!0),window.removeEventListener("keyup",this._releaseEditLayout,!0),this._editLayoutHeld=!1},this._onCopyFocusOut=t=>{if(t.relatedTarget)return;const e=t.composedPath(),i=this.toolbarHost;if(!(e.includes(this.renderRoot)||i&&e.includes(i)))return;const s=e[0];if(!(s instanceof HTMLElement&&s.isConnected))return;if(s.getClientRects().length>0)return;const r=s.closest("[data-preset]")?.getAttribute("data-preset"),n=r?`.shape-chip[data-preset="${r}"]`:s.classList.contains("preview-toggle-btn")?".preview-toggle-btn":s.classList.contains("btn-undo")?'curve-footer[variant="undo"]':null;n&&queueMicrotask(()=>{const t=document.activeElement;if(!t||t===document.body)for(const t of[this.renderRoot,this.toolbarHost])for(const e of t?.querySelectorAll(n)??[]){const t="curve-footer"===e.localName?e.shadowRoot?.querySelector(".btn-undo"):e;if(t&&t!==s&&0!==t.getClientRects().length&&"hidden"!==getComputedStyle(t).visibility)return void t.focus()}})},this._onInvitationControl=t=>{(this.experimentalFirstUse||this.canvasHelp)&&(t.composedPath().some(t=>t instanceof Element&&(t.classList.contains("canvas-help")||t.classList.contains("canvas-replay")))&&("undefined"!=typeof PointerEvent&&t instanceof PointerEvent?this._invitationInput=t.pointerType||"mouse":t instanceof KeyboardEvent&&["Enter"," "].includes(t.key)&&(this._invitationInput="keyboard")),t.composedPath().some(t=>t instanceof Element&&("curve-graph"===t.localName||t.classList.contains("invitation-dismiss")))||t instanceof KeyboardEvent&&["Tab","Shift","Escape"].includes(t.key)||this._dismissInvitation())},this._onInvitationVisibility=()=>{document.hidden&&(this._hoveredCurveId=null,this._dismissInvitation())},this._exitFocusBeforeUpdate=null,this._onPlotResize=()=>this._scheduleLayoutSync(),this._onGraphPointerDown=t=>{if(0!==t.button)return;const e=this._liveRipple;if(!e)return;const i=t.composedPath()[0]?.getAttribute?.("data-curve");null!=i&&this._curves[Number(i)]?.entityId===e.entityId&&this._stopRipple()},this._onRoomEdgeGrab=t=>{this._dismissInvitation(),this.renderRoot.querySelector("curve-scrubber")?.grab(t.detail)},this._onPreviewToggle=()=>{(this._canEditCurves||this._previewActive)&&(this._endLightGesture(),this._dismissInvitation(),this._clearPresetGraphTrial(),this._previewActive?this._stopPreview():this._startPreview())},this._startPreview=()=>{this._previewController.start()},this._stopPreview=()=>{this._previewController.stop()},this._onDrawInWaiting=t=>{this._drawIn&&t.detail?.token===this._drawIn.token&&(this._drawInWaitingForVisible=!0,null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=null)},this._onDrawInStarted=t=>{this._drawIn&&t.detail?.token===this._drawIn.token&&(this._drawInWaitingForVisible=!1,null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=setTimeout(this._boundStopDrawIn,function(t){const e=Number.isFinite(t)?Math.max(0,Math.trunc(t)):0,i=Kt+40*Math.max(0,e-1)+150;return Math.max(1200,i)}(t.detail.pointCount)))},this._onMoreOutside=t=>{t.composedPath().some(t=>t instanceof Element&&t.classList.contains("more-anchor"))||this._setMoreOpen(!1)}}_captureWriteReview(t){return t?{principal:{origin:t.origin,userId:t.userId,authEpoch:t.authEpoch},entry:t.configEntryId,generation:ni.writeGeneration(t,t.configEntryId)}:null}_writeReviewCurrent(t){if(!t)return!this._draftScope();const e=this._draftScope();return!!e&&e.origin===t.principal.origin&&e.userId===t.principal.userId&&e.authEpoch===t.principal.authEpoch&&e.configEntryId===t.entry&&ni.isCurrent(t.principal)&&ni.writeGeneration(t.principal,t.entry)===t.generation}get _saving(){return"saving"===(t=this._saveState).phase||"confirming"===t.phase;var t}get _saveSuccess(){return"saved"===this._saveState.phase}get _saveError(){return"error"===(t=this._saveState).phase?t.message:null;var t}_dispatchSave(t){const e="confirming"===this._saveState.phase;this._saveState=function(t,e){switch(e.type){case"reset":return{phase:"idle"};case"dirty":return"idle"===t.phase?{phase:"dirty"}:t;case"save-start":return"saving"===t.phase||"confirming"===t.phase?t:{phase:"saving"};case"save-success":return"saving"!==t.phase?t:{phase:"confirming"};case"save-confirmed":return"confirming"!==t.phase?t:{phase:"saved"};case"save-error":return"saving"!==t.phase&&"confirming"!==t.phase?t:{phase:"error",message:e.message};case"save-clear":return"saved"===t.phase||"error"===t.phase?{phase:"idle"}:t}}(this._saveState,t),"save-start"===t.type&&"saving"===this._saveState.phase&&this._clearMembershipStatus(),"confirming"!==this._saveState.phase&&"saving"!==this._saveState.phase&&this._saveGuard.onLeaveConfirming(this._saveState.phase,e)}get _dragActive(){return null!==this._editGesture}get _lightGesture(){return"light"===this._editGesture?.kind?this._editGesture:null}get _lastPreviewTime(){return this._previewController.lastPreviewTime}set _lastPreviewTime(t){this._previewController.lastPreviewTime=t}get _embedded(){return!0===this._config.embedded}get _hostedToolbar(){return!!this.toolbarHost?.isConnected}_clearToolbarHost(){this._setMoreOpen(!1);const t=this._activeToolbarHost;t&&(t.removeEventListener("pointerdown",this._onInvitationControl,!0),t.removeEventListener("keydown",this._onInvitationControl,!0),t.removeEventListener("pointerdown",this._boundStopDrawIn,!0),t.removeEventListener("keydown",this._boundStopDrawIn,!0),t.removeEventListener("click",this._boundStopDrawIn,!0),t.removeEventListener("pointerdown",this._onToolbarInteraction,!0),t.removeEventListener("keydown",this._onToolbarInteraction,!0),t.removeEventListener("focusin",this._onToolbarInteraction,!0)),t&&ns.get(t)===this&&(lt(K,t),t.hidden=!0,ns.delete(t)),this._activeToolbarHost=null}_syncToolbarHost(){const t=this.isConnected&&this._hostedToolbar?this.toolbarHost:null;if(this._activeToolbarHost!==t&&this._clearToolbarHost(),!t)return;const e=ns.get(t);e&&e!==this&&(e.toolbarHost=null,e._clearToolbarHost()),this._activeToolbarHost!==t&&(t.addEventListener("pointerdown",this._onInvitationControl,!0),t.addEventListener("keydown",this._onInvitationControl,!0),t.addEventListener("pointerdown",this._boundStopDrawIn,!0),t.addEventListener("keydown",this._boundStopDrawIn,!0),t.addEventListener("click",this._boundStopDrawIn,!0),t.addEventListener("pointerdown",this._onToolbarInteraction,!0),t.addEventListener("keydown",this._onToolbarInteraction,!0),t.addEventListener("focusin",this._onToolbarInteraction,!0)),ns.set(t,this),this._activeToolbarHost=t,t.hidden=!1,lt(W`<style>
          ${bi.cssText}</style
        >${this._renderToolbar()}`,t,{host:this})}static getConfigElement(){return document.createElement("lightener-curve-card-editor")}static getStubConfig(){return{type:Oe}}setConfig(t){const e=t.entity!==this._config.entity;e&&(this._previewController.disconnect(),this._managingLights=!1,this._leaveDraftContext(),this._knownEntryId=null,this._draftOwner=crypto.randomUUID(),this._draftLost=!1,this._savedRead=null,this._resumeUnverified=!1,this._resumePayload=null,this._verifyAfterDiscard=!1,this._writeReview={kind:"live"},this._suppressDraftCapture=!1,this._draftNotice=null,this._endLightGesture(!1),this._dismissInvitation(),this._clearCanvasHelpNotice(),this._hoveredCurveId=null);const i=!0===t.firstRun;this._config=t,this._joy=function(t){if(null===t||"object"!=typeof t||Array.isArray(t))return Vt;const e=t,i={...Vt};for(const t of Wt){const s=e[t];"boolean"==typeof s&&(i[t]=s)}return Object.freeze(i)}(t.joy),!e&&this._joy.ripple||this._stopRipple(),!e&&this._joy.draw_in||(this._stopDrawIn(),this._stopDrawOut()),e?(this._contextGeneration++,this._loadGeneration++,this._baseline=null,this._rawBaseline=null,this._membershipBaseline=null,this._saveIssue=null,this._saveReview=null,this._submittedIntent=null,this._saveGuard.settleError(),this._saveGuard.dispose(),this._dispatchSave({type:"reset"}),this._load={...this._load,loading:!1},this._stopCurveAnimation(),this._clearMembershipStatus(),this._previewActive&&this._stopPreview(),this._setMembershipOpen(!1),this._editGesture=null,this._load=function(t){return{...t,loaded:!1,loadedEntityId:void 0,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._groupDeleted=!1,this._clearPresetGraphTrial(),this._selectedCurveId=null,this._editRequested=!1,this._scrubberPosition=null,this._sessionStateInitialized=!1,this._undoStack=[],this._invitationAutoAllowed=!1,this._invitationEditHint=null,this._invitationTogether=!1,this._coach.configure(i&&!this.experimentalFirstUse,!0),this._cleanVersion=this._dirtyVersion,this._tryLoadCurves()):this._coach.configure(i&&!this.experimentalFirstUse,!1)}set hass(t){const e=!!this._hass,i=this._identityAvailable,s=t.user?.id?.trim();if(this._identityAvailable=!!s,s){const t=this._draftPrincipal,e=ni.activatePrincipal(location.origin,s);!t||t.userId===e.userId&&t.authEpoch===e.authEpoch||this._invalidateDraftIdentity(),this._draftPrincipal=e;for(const t of this._identityUnavailableRuntimeEntries)ni.markRuntimeBlocked(e,t);this._identityUnavailableRuntimeEntries.clear(),this._identityAvailable=!0,this._authInvalidated=!1}this._hass=t,this.isConnected?this._previewController.connect():this._previewController.observe(),!this._isAdmin&&this._retainedReview&&this._dismissSaveReview(),!this._isAdmin&&this._pendingRecoveryClaim&&(ni.release(this._pendingRecoveryClaim.scope,this._pendingRecoveryClaim.claim),this._pendingRecoveryClaim=null,this._recoveryGeneration++,this._savedRead=null),this._subscribeDraft(),this._isDirty&&this._identityAvailable&&!i&&this._checkpointDraft(),this._isAdmin||(this._endLightGesture(!1),this._editRequested=!1),e&&this._load.loaded||this._dragActive||this._tryLoadCurves()}getCardSize(){return 4}getGridOptions(){return{columns:12,rows:9,min_columns:6,min_rows:6}}get _isAdmin(){return this._hass?.user?.is_admin??!1}get _entityId(){return this._config.entity}get _storageEntityId(){return this._load.loadedEntityId??this._entityId}get _isDirty(){return this._dirtyVersion!==this._cleanVersion}get editMode(){return this._editRequested||this._isDirty||this._saving}get _editLayout(){return this.editMode&&!this._editLayoutHeld}_holdEditLayout(){this.editMode||this._editLayoutHeld||!this._isAdmin||(this._editLayoutHeld=!0,window.addEventListener("pointerup",this._releaseEditLayout,!0),window.addEventListener("pointercancel",this._releaseEditLayout,!0),window.addEventListener("keyup",this._releaseEditLayout,!0))}enterEditMode(){return!!this._canEditCurves&&(this._requestEdit(),!0)}exitEditMode(){return!this._isDirty&&!this._saving&&(this._endLightGesture(),this._dismissInvitation(),this._clearPresetGraphTrial(),this._returnToView(),!0)}_requestEdit(){this._isAdmin&&(this._editRequested=!0,this._editRequests++)}_returnToView(){this._releaseEditLayout(),this._editRequested=!1,this._selectedCurveId=null,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:null})}get _membershipLocked(){return this._membershipOpen||this._managingLights}get _canEditCurves(){return!this._cancelAnimating&&this._canUndoCurves}get _canUndoCurves(){return this._isAdmin&&!this._saving&&!this._membershipLocked&&!this._load.loadError&&this._load.loadedEntityId===this._entityId&&!this._groupDeleted&&!this._runtimeBlocked&&!this._draftLost&&!this._savedRead&&!this._resumeUnverified&&!this._draftAuthStale&&!this._saveReview}get _draftAuthStale(){return this._authInvalidated||!!this._draftPrincipal&&!ni.isCurrent(this._draftPrincipal)}_draftScope(){return this._identityAvailable&&this._draftPrincipal&&ni.isCurrent(this._draftPrincipal)&&this._knownEntryId?{...this._draftPrincipal,configEntryId:this._knownEntryId,surface:this.draftSurface}:null}get _draftWriteNeedsReview(){const t=this._draftScope();return!!t&&("live"!==this._writeReview.kind||ni.hasUnknownWrite(t,t.configEntryId))&&!("accepted"===this._writeReview.kind&&this._writeReviewCurrent(this._writeReview.stamp))&&ni.hasUnresolvedWrite(t,t.configEntryId)}_beginSavedRead(){return this._savedRead={context:this._contextGeneration,generation:++this._recoveryGeneration}}_ownsSavedRead(t){return this._savedRead===t&&t.context===this._contextGeneration&&t.generation===this._recoveryGeneration}_finishSavedRead(t){this._ownsSavedRead(t)&&(this._savedRead=null)}async _readLatestSaved(t,e,i){const s=this._captureWriteReview(this._draftScope()),r=()=>{if(!t())return!1;if(!this._writeReviewCurrent(s))throw new rs(mt.drafts.savedChanged);return!0},n=await this._hass.callWS({type:"lightener/get_curves",entity_id:this._entityId});if(!r())return null;const o=qe(n);if(!o||e&&o.config_entry_id!==e)throw new rs(i);return{latest:o,curves:fe(o.entities,this._hass.states,Ht),writeReview:s,valid:r}}_subscribeDraft(){const t=this._draftScope(),e=t?JSON.stringify(t):"";this._draftSubscriptionKey===e&&this._draftUnsubscribe||(this._draftUnsubscribe?.(),this._draftUnsubscribe=null,this._draftSubscriptionKey="",t&&this.isConnected&&(this._draftSubscriptionKey=e,ni.hasUnresolvedWrite(t,t.configEntryId)&&(this._writeReview={kind:"required"}),this._draftUnsubscribe=ni.subscribe(t,()=>{ni.isCurrent(t)||this._invalidateDraftIdentity(),this._runtimeBlocked&&(this._previewController.observe(),this._saveReview&&this._dismissSaveReview()),this.requestUpdate()})))}_invalidateDraftIdentity(){this._authInvalidated=!0,this._managingLights=!1,this._writeReview={kind:"live"},this._previewController.disconnect(!1),this._draftUnsubscribe?.(),this._draftUnsubscribe=null,this._draftSubscriptionKey="",this._contextGeneration++,this._loadGeneration++,this._recoveryGeneration++,this._saveGuard.settleError(),this._saveGuard.dispose(),this._stopCurveAnimation(),this._curves=[],this._originalCurves=[],this._undoStack=[],this._baseline=null,this._rawBaseline=null,this._membershipBaseline=null,this._knownEntryId=null,this._draftClaim=null,this._claimedScope=null,this._resumeTicket=null,this._resumePayload=null,this._resumeUnverified=!1,this._pendingRecoveryClaim=null,this._retainedReview=null,this._draftPrincipal=null,this._identityAvailable=!1,this._draftLost=!1,this._savedRead=null,this._saveReview=null,this._saveIssue=null,this._submittedIntent=null,this._dirtyVersion++,this._cleanVersion=this._dirtyVersion,this._identityUnavailableRuntimeEntries.clear(),this._dispatchSave({type:"reset"}),this._load={...$i}}_draftPayload(){const t=this._runtimeBlocked?"runtime":this._saving||"uncertain"===this._saveIssue||this._draftWriteNeedsReview?"unknown":this._membershipBaseline||"reread"===this._saveIssue?"reread":"conflict"===this._saveIssue?"conflict":"incompatible"===this._saveIssue?"unsupported":"ordinary";return{schema:1,entityId:this._entityId,baselineRevision:this._membershipBaseline?null:this._baseline?.revision??null,baseline:Qe(this._originalCurves),local:Qe(this._curves),undo:this._undoStack.map(Qe),outcome:t}}_checkpointDraft(){if(this._suppressDraftCapture||this._draftLost||this._retainedReview||this._resumeUnverified)return;const t=this._draftScope(),e=!ti(Qe(this._originalCurves),Qe(this._curves));if(!t)return void(e&&(this._draftNotice=mt.drafts.unavailable));if(this._draftClaim&&this._claimedScope&&!ni.owns(this._claimedScope,this._draftClaim))return void(this._draftLost=!0);if(!e)return this._draftClaim&&this._claimedScope&&ni.clear(this._claimedScope,this._draftClaim),this._draftClaim=null,void(this._claimedScope=null);const i=this._draftClaim?ni.update(t,this._draftClaim,this._draftPayload()):ni.create(t,this._draftOwner,this._draftPayload());i.ok?(this._draftClaim=i.value,this._claimedScope=t,this._draftNotice=null):(i.claim&&(this._draftClaim=i.claim),this._draftNotice=mt.drafts.notRetained)}_leaveDraftContext(t=!1){if(this._checkpointDraft(),t&&(this._writeReview={kind:"required"}),this._pendingRecoveryClaim&&ni.release(this._pendingRecoveryClaim.scope,this._pendingRecoveryClaim.claim),this._pendingRecoveryClaim=null,this._pendingDraftWrite&&ni.settleWrite(this._pendingDraftWrite.principal,this._pendingDraftWrite.entry,this._pendingDraftWrite.id,"unknown"),this._retainedReview&&!this._retainedReview.localCopy&&ni.release(this._retainedReview.scope,this._retainedReview.claim),this._retainedReview=null,this._draftClaim&&this._claimedScope){const e=ni.release(this._claimedScope,this._draftClaim);this._resumeTicket=t?e:null}this._draftClaim=null,t||(this._claimedScope=null,this._resumeTicket=null),this._draftUnsubscribe?.(),this._draftUnsubscribe=null,this._draftSubscriptionKey=""}discardNavigationDraft(){this._draftClaim&&this._claimedScope&&ni.clear(this._claimedScope,this._draftClaim),this._draftClaim=null,this._claimedScope=null,this._resumeTicket=null,this._draftLost=!1,this._suppressDraftCapture=!0,this._resumePayload=null,this._draftNotice=null}_curvesFromGeometry(t){const e=new Map(this._curves.map(t=>[t.entityId,t]));return t.map(t=>({entityId:t.entityId,friendlyName:this._hass?.states[t.entityId]?.attributes.friendly_name??t.entityId,color:e.get(t.entityId)?.color??Ht[0],controlPoints:t.points.map(t=>({...t}))}))}async _resumeNavigationDraft(){this._writeReview={kind:"required"};const t=this._claimedScope,e=this._resumeTicket;if(!(t&&e&&this._hass&&this._draftScope()))return void(e&&(this._draftLost=!0));const i=ni.resume(t,e);if(this._resumeTicket=null,!i.ok)return this._draftLost=!0,void(this._draftNotice=mt.drafts.openedElsewhere);this._draftClaim=i.value.claim,this._resumePayload=i.value.payload,this._resumeUnverified=!0,await this._readNavigationDraft(t,i.value.claim,i.value.payload,!0)}async _recoverNavigationDraft(t){this._writeReview={kind:"required"};const e=this._draftScope();if(!e||this._isDirty||this._savedRead||!this._isAdmin)return;const i=ni.claim(e,t.draftId,t.version,this._draftOwner);if(!i.ok)return this._draftNotice=mt.drafts.changed,void this.requestUpdate();this._pendingRecoveryClaim={scope:e,claim:i.value.claim},await this._readNavigationDraft(e,i.value.claim,i.value.payload,!1)}async _readNavigationDraft(t,e,i,s){if(!this._hass)return;const r=this._beginSavedRead(),n=this._draftOwner,o=()=>this.isConnected&&this._ownsSavedRead(r)&&n===this._draftOwner&&ni.isCurrent(t)&&ni.owns(t,e)&&this._isAdmin&&JSON.stringify(this._draftScope())===JSON.stringify(t);try{const r=await this._readLatestSaved(o,t.configEntryId,mt.drafts.unavailableSaved);if(!r?.valid())return void ni.release(t,e);const{latest:n,curves:a,writeReview:h}=r,l=ti(i.baseline,Qe(a)),d=t=>JSON.stringify(t.map(t=>t.entityId))===JSON.stringify(i.baseline.map(t=>t.entityId)),c="ordinary"===i.outcome&&i.baselineRevision===n.revision&&!ni.hasUnresolvedWrite(t,t.configEntryId);if(c&&(!l||!d(i.local)||i.undo.some(t=>!d(t))))throw new rs(mt.drafts.inconsistent);"runtime"===i.outcome&&ni.markRuntimeBlocked(t,t.configEntryId);const p=ni.isRuntimeBlocked(t,t.configEntryId);if(p&&(!l||i.baselineRevision!==n.revision||!d(i.local)||i.undo.some(t=>!d(t))))throw new rs(mt.drafts.unavailableSaved);if(c||p)this._draftClaim=e,this._claimedScope=t,this._knownEntryId=t.configEntryId,s||(this._curves=this._curvesFromGeometry(i.local),this._originalCurves=be(a),this._undoStack=i.undo.map(t=>this._curvesFromGeometry(t)),this._dirtyVersion++,this._cleanVersion=this._dirtyVersion-1),this._baseline=n,this._rawBaseline=n.entities,this._saveIssue=ni.isRuntimeBlocked(t,t.configEntryId)?"runtime":null,this._draftNotice=null,this._resumeUnverified=!1,this._resumePayload=null,this._pendingRecoveryClaim=null,this._suppressDraftCapture=!1,this._requestEdit();else if(s)this._resumeUnverified=!0,this._baseline=null,this._submittedIntent=null,this._saveIssue="unknown"===i.outcome?"uncertain":"conflict";else{this._pendingRecoveryClaim=null,this._retainedReview={scope:t,claim:e,payload:i,localCopy:!1};const s=this._curvesFromGeometry(i.baseline),r=this._curvesFromGeometry(i.local);this._saveReview={writeReview:h,latest:n,curves:a,members:Je(s,r,a)}}}catch(i){o()&&(this._draftNotice=i instanceof rs?i.message:mt.drafts.unavailableSaved,s&&(this._resumeUnverified=!0,this._baseline=null,this._saveIssue="reread")),s||ni.release(t,e)}finally{this._pendingRecoveryClaim?.claim.draftId===e.draftId&&this._pendingRecoveryClaim.claim.claimEpoch===e.claimEpoch&&(ni.release(t,e),this._pendingRecoveryClaim=null),this._finishSavedRead(r)}}async _retryNavigationResume(){!this._isAdmin||this._savedRead||this._draftAuthStale||(this._claimedScope&&this._draftClaim&&this._resumePayload?await this._readNavigationDraft(this._claimedScope,this._draftClaim,this._resumePayload,!0):this._entityId&&this._reloadCurvesAfterCurrentLoad(this._entityId))}async _discardOrphanDraft(t){const e=this._draftScope();if(!e||this._isDirty)return;const i=ni.claim(e,t.draftId,t.version,this._draftOwner);i.ok?ni.clear(e,i.value.claim):this._draftNotice=mt.drafts.changed,this.requestUpdate()}async _reviewLostLocalCopy(){if(this._writeReview={kind:"required"},!this._draftLost||!this._hass||!this._draftScope()||!this._isAdmin||this._savedRead)return;const t=this._draftScope(),e=this._beginSavedRead(),i=this._draftOwner,s=()=>this._draftLost&&this.isConnected&&this._ownsSavedRead(e)&&i===this._draftOwner&&this._isAdmin&&ni.isCurrent(t)&&JSON.stringify(this._draftScope())===JSON.stringify(t);try{const e=await this._readLatestSaved(s,t.configEntryId,mt.drafts.unavailableSaved);if(!e?.valid())return;const{latest:i,curves:r,writeReview:n}=e;this._retainedReview={scope:t,claim:{draftId:"",ownerId:this._draftOwner,claimEpoch:0,version:0},payload:this._draftPayload(),localCopy:!0},this._saveReview={writeReview:n,latest:i,curves:r,members:Je(this._originalCurves,this._curves,r)}}catch{s()&&(this._draftNotice=mt.drafts.unavailableSaved)}finally{this._finishSavedRead(e)}}_renderNavigationDrafts(){const t=this._draftScope(),e=t&&this._isAdmin&&!this._isDirty&&!this._savedRead&&!this._draftClaim&&this._baseline?ni.list(t):[];return this._resumeUnverified||this._draftNotice||!t&&this._isDirty||this._draftLost||this._draftWriteNeedsReview||e.length?W`<div class="navigation-drafts">
      ${this._resumeUnverified?W`<span role="status"
            >${mt.drafts.unverified}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead||!this._isAdmin}
              @click=${()=>this._retryNavigationResume()}
            >
              ${mt.guardedSave.check}
            </button></span
          >`:K}${this._draftNotice?W`<span role="status">${this._draftNotice}</span>`:!t&&this._isDirty?W`<span role="status">${mt.drafts.unavailable}</span>`:K}
      ${this._draftLost?W`<span role="status"
            >${mt.drafts.openedElsewhere}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead}
              @click=${()=>this._reviewLostLocalCopy()}
            >
              ${mt.drafts.reviewLocal}
            </button></span
          >`:K}
      ${this._draftWriteNeedsReview&&!this._draftLost?W`<span role="status"
            >${mt.drafts.unknown}<button
              class="command-retry"
              type="button"
              ?disabled=${this._savedRead||this._runtimeBlocked}
              @click=${()=>this._reviewLatest()}
            >
              ${mt.guardedSave.review}
            </button></span
          >`:K}
      ${e.map(t=>W`<span role="status"
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
    </div>`:K}get _runtimeBlocked(){const t=this._baseline?.config_entry_id??this._knownEntryId;return!!t&&(this._identityUnavailableRuntimeEntries.has(t)||!!this._draftPrincipal&&ni.isRuntimeBlocked(this._draftPrincipal,t))}get _canGuardedSave(){return this._canEditCurves&&!!this._baseline&&!this._membershipBaseline&&!this._saveIssue&&!this._draftWriteNeedsReview&&!this._runtimeBlocked}get _selectedCurve(){if(null!==this._selectedCurveId)return this._curves.find(t=>t.entityId===this._selectedCurveId)}get _canShowPresetGraphTrial(){return!(void 0===this._selectedCurve||this._saving||this._cancelAnimating||this._drawIn||this._membershipLocked||this._previewActive)}get _isShowingPresetGraphTrial(){return null!==this._presetGraphTrial&&this._canShowPresetGraphTrial&&this._liveRipple?.entityId!==this._selectedCurveId}get _graphCurves(){const t=this._invitation.curve;return t?this._curves.map(e=>e.entityId===t.entityId?t:e):this._curves}get _effectiveScrubberPosition(){return this._scrubberPosition??100}get _shownRoomPosition(){return this._invitation.roomPosition??this._effectiveScrubberPosition}_restoreInvitationSelection(){void 0!==this._invitationSelection&&(this._selectedCurveId=this._invitationSelection,this._invitationSelection=void 0)}get _invitationGuidance(){if(this._invitation.frozen)return mt.canvasHelp.paused;const t=this._invitation.phase;if("preset"===t){const t=ft.find(t=>t.id===this._invitation.presetId)?.name??"";return mt.canvasHelp.choose(t)}return"point"===t&&"keyboard"===this._invitationInput?mt.canvasHelp.keyboardPoint:"add"===t?this._invitationGestureText(!1):"remove"===t?this._invitationGestureText(!0):mt.canvasHelp.steps[t]}_invitationGestureText(t){return"keyboard"===this._invitationInput?t?mt.canvasHelp.keyboardRemove:mt.canvasHelp.keyboardAdd:"touch"===this._invitationInput||"pen"===this._invitationInput?t?mt.canvasHelp.touchRemove:mt.canvasHelp.touchAdd:t?mt.canvasHelp.mouseRemove:mt.canvasHelp.mouseAdd}get _invitationCaption(){return this._invitation.frozen?null:"point"===this._invitation.phase?"lightDimmer"===this._invitation.message?mt.canvasHelp.dimLight:mt.canvasHelp.brightenLight:"room"===this._invitation.phase?mt.canvasHelp.adjustRoom:"add"===this._invitation.message?mt.canvasHelp.addPoint:"remove"===this._invitation.message?mt.canvasHelp.removePoint:null}get _presetPreviewCurve(){const t=this._selectedCurve;if(!t)return null;const e=this._liveRipple,i=e?.entityId===t.entityId?e.committed:this._canShowPresetGraphTrial&&this._isShowingPresetGraphTrial?this._presetGraphTrial?.controlPoints:null;return i?{...t,controlPoints:[...i]}:null}get _invitationTarget(){const t=t=>{const e=this._hass?.states[t.entityId]?.state;return void 0!==e&&"unavailable"!==e&&"unknown"!==e};return this._curves.find(e=>e.entityId===this._selectedCurveId&&t(e))??this._curves.find(t)}get _canRunInvitation(){const t=this._invitation.curve?this._curves.find(t=>t.entityId===this._invitation.curve?.entityId):this._invitationTarget,e=this.renderRoot.querySelector("curve-graph"),i=t&&this._hass?.states[t.entityId]?.state;return(this.experimentalFirstUse||this.canvasHelp)&&(!e?.interactionActive||!!this._invitation.curve)&&this.isConnected&&this._isAdmin&&this._load.loaded&&this._load.loadedEntityId===this._entityId&&!this._load.loading&&!this._load.loadError&&!this._groupDeleted&&!this._saving&&!this._saveSuccess&&!this._saveError&&!this._isDirty&&!this._cancelAnimating&&!this._membershipLocked&&!this._previewActive&&!this._drawIn&&!this._isShowingPresetGraphTrial&&!!t&&void 0!==i&&"unavailable"!==i&&"unknown"!==i}_startInvitation(t=!1){if(this._clearInvitationStartTimer(),this.renderRoot.querySelector("curve-graph")?.interactionActive)return;if(t&&!Re(this._curves))return void(this._invitationAutoAllowed=!1);const e=this._invitationTarget;this._canRunInvitation&&e&&this._entityId&&(this._invitationSelection=this._selectedCurveId,this._selectedCurveId=e.entityId,this._invitationAutoAllowed=!1,this._clearPresetGraphTrial(),this._coach.dismiss(),this._invitationEditHint=null,this._invitationTogether=!1,this._invitation.start(e,this._joy.ripple,this._scrubberPosition,this._invitationInput),this._invitationFromView=!this.editMode,t||this._requestEdit(),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=Xt(()=>this._invitation.freeze()),Te(this._entityId,"seen"))}_dismissInvitation(){if(this._clearInvitationStartTimer(),this._cancelGripHint(),this._invitationAutoAllowed=!1,!this._invitation.curve)return;const t=this.renderRoot.querySelector("curve-graph"),e=t?.shadowRoot?.activeElement,i=e&&t?.curves[Number(e.getAttribute("data-curve"))],s=i?.controlPoints[Number(e?.getAttribute("data-point"))],r=this._entityId;t?.cancelInteraction(),this._editGesture=null,this._restoreInvitationSelection(),this._invitation.clear(),!this._invitationFromView||this._isDirty||this._saving||(this._editRequested=!1),this._invitationFromView=!1,this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,this._entityId&&Te(this._entityId,"dismissed"),e&&this.updateComplete.then(async()=>{await(t?.updateComplete);const n=this.shadowRoot?.activeElement,o=t?.shadowRoot?.activeElement;let a=document.activeElement;for(;a?.shadowRoot?.activeElement;)a=a.shadowRoot.activeElement;const h=!a||[document.body,document.documentElement,this,t,e].includes(a);r!==this._entityId||!h||n&&n!==t||o&&o!==e||i&&s&&t?.focusPoint(i.entityId,s.lightener)||this._focusHelpButton({preventScroll:!0})})}_finishInvitation(){this._invitation.curve&&(this._invitationSelection=void 0,this._invitationFromView=!1,this._invitation.clear(),this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,this._entityId&&Te(this._entityId,"completed"),this._invitationTogether=!0,this._invitationEditHint="touch"===this._invitationInput||"pen"===this._invitationInput?mt.invitation.touchAdd:"keyboard"===this._invitationInput?mt.invitation.keyboardAdd:mt.invitation.mouseAdd,null!==this._invitationHintTimer&&clearTimeout(this._invitationHintTimer),this._invitationHintTimer=setTimeout(()=>{this._invitationEditHint=null,this._invitationTogether=!1,this._invitationHintTimer=null},jt.context),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_focusHelpButton(t){const e=this.experimentalFirstUse?this._visible(".invitation-replay"):null;e?e.focus(t):this._focusMoreButton(t)}_toggleCanvasHelp(t=!1){if(this._invitation.curve&&!t)return void this._closeCanvasHelp();if(this._hoveredCurveId=null,t&&this._dismissInvitation(),this._clearPresetGraphTrial(),this._clearInvitationStartTimer(),!this._canRunInvitation)return void this._showCanvasHelpNotice(this._isDirty?mt.canvasHelp.draft:this._previewActive?mt.canvasHelp.watching:mt.canvasHelp.busy);this._clearCanvasHelpNotice();const e=this.renderRoot.querySelector("curve-graph"),i=e?.getBoundingClientRect();i&&(i.top<0||i.bottom>window.innerHeight)&&e?.scrollIntoView?.({block:"center",behavior:"instant"}),this._startInvitation()}_playGripHint(){Zt(this._joy,"grip_hint")&&this.updateComplete.then(()=>this.renderRoot.querySelector("curve-scrubber")?.playGripHint(jt.orientation))}_cancelGripHint(){this.renderRoot?.querySelector("curve-scrubber")?.cancelGripHint()}_closeCanvasHelp(){const t=this.renderRoot.querySelector("curve-graph");this._dismissInvitation(),this.updateComplete.then(async()=>{if(await(t?.updateComplete),!this.isConnected)return;const e=this._activeFocusPath().at(-1);e&&e!==document.body&&e!==this&&e.isConnected||this._focusHelpButton({preventScroll:!0})})}_showCanvasHelpNotice(t){this._clearCanvasHelpNotice(),this._canvasHelpNotice=t,this._canvasHelpNoticeTimer=setTimeout(()=>{this._canvasHelpNoticeTimer=null,this._canvasHelpNotice=null},jt.context)}_clearCanvasHelpNotice(){null!==this._canvasHelpNoticeTimer&&clearTimeout(this._canvasHelpNoticeTimer),this._canvasHelpNoticeTimer=null,this._canvasHelpNotice=null}_onGraphInteraction(t){if("start"===t.detail.phase&&(this._endLightGesture(),this._hoveredCurveId=null),(this.experimentalFirstUse||this.canvasHelp)&&this.requestUpdate(),"start"===t.detail.phase&&(this._clearInvitationStartTimer(),this._invitationAutoAllowed=!1,this._invitationInput=t.detail.input,this._invitation.curve)){this._invitation.freeze();const t=this.renderRoot.querySelector("curve-graph");t&&(t.curves=this._graphCurves,t.curveFrame=this._curveFrame)}}_clearInvitationStartTimer(){null!==this._invitationStartTimer&&clearTimeout(this._invitationStartTimer),this._invitationStartTimer=null}_scheduleAutomaticInvitation(){if(!this._invitationAutoAllowed||!this._invitationVisible||document.hidden||!this._canRunInvitation)return void this._clearInvitationStartTimer();if(null!==this._invitationStartTimer)return;const t=this._entityId,e=this._invitationGraph;this._invitationStartTimer=setTimeout(()=>{this._invitationStartTimer=null,t===this._entityId&&e===this._invitationGraph&&this._invitationAutoAllowed&&this._invitationVisible&&!document.hidden&&this._startInvitation(!0)},Ee)}_syncInvitation(){if(!this.experimentalFirstUse&&!this.canvasHelp)return;const t=this.renderRoot.querySelector("curve-graph");t!==this._invitationGraph&&(this._clearInvitationStartTimer(),this._invitationObserver?.disconnect(),this._invitationGraph=t,this._invitationVisible=!1,t&&"undefined"!=typeof IntersectionObserver?(this._invitationObserver=new IntersectionObserver(t=>{const e=t.find(t=>t.target===this._invitationGraph);if(!e)return;const i=this._invitationVisible;this._invitationVisible=e.isIntersecting&&e.intersectionRatio>=.5,this._invitationVisible?this._scheduleAutomaticInvitation():(this._clearInvitationStartTimer(),(i||this._invitation.curve)&&this._dismissInvitation())},{threshold:[0,.5]}),this._invitationObserver.observe(t)):this._invitationVisible=!!t),this._invitation.curve&&!this._canRunInvitation&&this._dismissInvitation(),this._scheduleAutomaticInvitation()}get _canManageLights(){return this._isAdmin&&!!this._hass&&!!this._entityId&&!this._isDirty&&!this._saving&&!this._cancelAnimating&&!this._load.loading&&!this._membershipLocked&&!this._load.loadError&&!this._groupDeleted&&!this._runtimeBlocked&&!this._draftLost&&!this._savedRead&&!this._resumeUnverified&&!this._draftAuthStale&&!this._saveReview}get dirty(){return this._isDirty}connectedCallback(){this._previewController.connect(),super.connectedCallback(),this._draftPrincipal&&!ni.isCurrent(this._draftPrincipal)&&this._invalidateDraftIdentity(),this._subscribeDraft(),this._resumeTicket&&this._claimedScope&&this._resumeNavigationDraft(),this._load.loadErrorEntityId!==this._entityId&&(this._load=Ii(this._load)),this._groupDeleted&&this._load.loadedEntityId!==this._entityId&&(this._groupDeleted=!1,this._load=Ii(this._load)),this._tryLoadCurves(),this._boundKeyHandler=this._onKeyDown.bind(this),this._boundBeforeUnload=this._onBeforeUnload.bind(this),window.addEventListener("keydown",this._boundKeyHandler),window.addEventListener("beforeunload",this._boundBeforeUnload),this._boundLayoutSync=()=>this._scheduleLayoutSync(),window.addEventListener("resize",this._boundLayoutSync),window.visualViewport?.addEventListener("resize",this._boundLayoutSync),this._coach.connect(this),this.addEventListener("pointerdown",this._onInvitationControl,!0),this.addEventListener("keydown",this._onInvitationControl,!0),document.addEventListener("visibilitychange",this._onInvitationVisibility),window.addEventListener("focusout",this._onCopyFocusOut,!0)}disconnectedCallback(){this._managingLights=!1,this._previewController.disconnect(),this._leaveDraftContext(!0),this._saving&&(this._saveIssue="uncertain"),this._contextGeneration++,this._loadGeneration++,this._recoveryGeneration++,this._savedRead=null,this._saveReview=null,this._load={...this._load,loading:!1},this._commandFocusVersion++,this._pendingCommandFocus=null,this._clearToolbarHost(),this._endLightGesture(!1),this._layoutObserver?.disconnect(),this._layoutObserver=null,this._layoutNodes=[],this._pendingNarrowLayout=null,this._releaseEditLayout(),this._dismissInvitation(),this._invitationObserver?.disconnect(),this._invitationGraph=null,this._invitationMotionUnsubscribe?.(),this._invitationMotionUnsubscribe=null,null!==this._invitationHintTimer&&clearTimeout(this._invitationHintTimer),this._invitationHintTimer=null,this._clearWatchHintTimer(),this._invitationEditHint=null,this._invitationTogether=!1,this._clearCanvasHelpNotice(),this.removeEventListener("pointerdown",this._onInvitationControl,!0),this.removeEventListener("keydown",this._onInvitationControl,!0),document.removeEventListener("visibilitychange",this._onInvitationVisibility),window.removeEventListener("focusout",this._onCopyFocusOut,!0),super.disconnectedCallback(),this._stopDrawIn(),this._stopDrawOut(),this._clearMembershipStatus(),this._previewActive&&this._stopPreview(),this._clearPresetGraphTrial(),this._setMembershipOpen(!1),this._coach.disconnect(),this._previewController.disconnect(),this._editGesture=null,this._boundKeyHandler&&window.removeEventListener("keydown",this._boundKeyHandler),this._boundBeforeUnload&&window.removeEventListener("beforeunload",this._boundBeforeUnload),this._boundLayoutSync&&(window.removeEventListener("resize",this._boundLayoutSync),window.visualViewport?.removeEventListener("resize",this._boundLayoutSync)),null!==this._layoutFrame&&(cancelAnimationFrame(this._layoutFrame),this._layoutFrame=null),this._saving&&(this._saveGuard.settleError(),this._load={...this._load,loading:!1,loaded:!1,reloadAfterLoadEntityId:void 0},this._dispatchSave({type:"reset"})),this._saveGuard.dispose(),this._stopCurveAnimation(),this._stopRipple()}_commandButtons(){const t=new Map;for(const e of[this.renderRoot,this._activeToolbarHost]){if(!e)continue;const i=[e];for(const t of e.querySelectorAll("curve-footer, curve-scrubber"))t.renderRoot&&i.push(t.renderRoot);for(const e of i){for(const i of["preview-toggle-btn","btn-save","btn-undo","more-button","edit-button","done-button","invitation-replay","command-retry"])for(const s of e.querySelectorAll(`.${i}`))(!t.has(i)||s.getClientRects().length>0)&&t.set(i,s);const i=e.querySelector('[aria-label="Cancel changes"]');i&&t.set("cancel",i)}}return t}willUpdate(t){super.willUpdate(t);const e=this._activeFocusPath(),i=e.map(t=>t.closest(".exit-slot")).find(t=>t&&(this.renderRoot.contains(t)||this._activeToolbarHost?.contains(t))),s=e.at(-1);if(this._exitFocusBeforeUpdate=i&&s instanceof HTMLElement?{active:s,slot:i}:null,this.dataset.mode=this.editMode?"edit":"view",null===this._hoveredCurveId||this._curves.some(t=>t.entityId===this._hoveredCurveId)||(this._hoveredCurveId=null),t.has("_narrowLayout")||t.has("toolbarHost")){this._commandFocusVersion++;for(const[t,e]of this._commandButtons())if(e.getRootNode().activeElement===e){this._pendingCommandFocus=t;break}}}async _restoreCommandFocus(){const t=this._pendingCommandFocus;if(!t)return;this._pendingCommandFocus=null;const e=this._commandFocusVersion,i=[this.renderRoot,this._activeToolbarHost];await Promise.all(i.flatMap(t=>t?[...t.querySelectorAll("curve-footer, curve-scrubber")].map(t=>t.updateComplete):[])),this.isConnected&&e===this._commandFocusVersion&&this._commandButtons().get(t)?.focus({preventScroll:!0})}updated(t){super.updated(t);const e=this._exitFocusBeforeUpdate;if(this._exitFocusBeforeUpdate=null,this._syncInvitation(),this._observeLayout(),!this._lightGesture||this._canEditCurves&&this._lightGesture.roomValue===this._effectiveScrubberPosition&&this._curves.some(t=>t.entityId===this._lightGesture?.entityId)||this._endLightGesture(),t.has("_curves")||t.has("_originalCurves")||t.has("_cancelAnimating")){const t=this._isDirty;t!==this._lastEmittedDirtyState&&(this._lastEmittedDirtyState=t,this.dispatchEvent(new CustomEvent("curve-dirty-state",{detail:{dirty:t,entityId:this._entityId},bubbles:!0,composed:!0})),t&&this._dispatchSave({type:"dirty"}))}const i=this._invitationFrame&&0===t.size;this._invitationFrame=!1,i||this._scheduleLayoutSync(),this._syncToolbarHost(),e&&this._restoreExitFocus(e),this._syncWatchHintTimer(),this._restoreCommandFocus()}async _restoreExitFocus({active:t,slot:e}){const i=this._visible(".exit-slot"),s=i?.querySelector("curve-footer");if(await(s?.updateComplete),!this.isConnected||!i?.isConnected)return;if(t.isConnected&&t!==e&&!t.matches(":disabled"))return;const r=this._activeFocusPath().at(-1);if(r&&r!==document.body&&r!==t&&r!==e)return;const n=i.querySelector("button:not(:disabled)")??s?.renderRoot.querySelector("button:not(:disabled)")??(this._saving||this._cancelAnimating?i:this._visible(".more-button"));n?.focus({preventScroll:!0})}_scheduleLayoutSync(){null===this._layoutFrame&&(this._layoutFrame=requestAnimationFrame(()=>{this._layoutFrame=null;const t=this._pendingNarrowLayout;if(this._pendingNarrowLayout=null,null!==t&&t!==this._narrowLayout)return this._endLightGesture(),void(this._narrowLayout=t);this._syncRoomAxis()}))}_observeLayout(){if("undefined"==typeof ResizeObserver)return;this._layoutObserver??=new ResizeObserver(t=>{for(const e of t)e.target.classList.contains("card")&&e.contentRect.width>0&&(this._pendingNarrowLayout=e.contentRect.width<860);this._scheduleLayoutSync()});const t=[...this.renderRoot.querySelectorAll(".card, .main-stack, .control-dock")];if(t.length!==this._layoutNodes.length||!t.every((t,e)=>t===this._layoutNodes[e])){this._layoutObserver.disconnect(),this._layoutNodes=t;for(const e of t)this._layoutObserver.observe(e)}}_syncRoomAxis(){const t=this.renderRoot.querySelector(".control-dock"),e=t?.querySelector("curve-scrubber"),i=this.renderRoot.querySelector("curve-graph"),s=i?.renderRoot?.querySelector("svg"),r=s?.querySelector(".plot-frame"),n=s?.getScreenCTM?.();if(!(t&&e&&r&&n&&"undefined"!=typeof DOMPoint))return;const o=new DOMPoint(r.x.baseVal.value,0).matrixTransform(n).x,a=new DOMPoint(r.x.baseVal.value+r.width.baseVal.value,0).matrixTransform(n).x,h=e.getBoundingClientRect();var l;e.style.setProperty("--room-axis-left",`${Math.max(0,o-h.left)}px`),e.style.setProperty("--room-axis-right",`${Math.max(0,h.right-a)}px`),t.querySelector(".room-surface")?.style.setProperty("--graph-pad-trim",((l=n.d)>0?36*l*(1-Ct(l)):0)+"px")}_setPresetGraphTrial(t){this._presetGraphTrial?.id!==t?.id&&(this._presetGraphTrial=t,this.dispatchEvent(new CustomEvent("preset-trial-change",{detail:{presetId:t?.id??null},bubbles:!0,composed:!0})))}_clearPresetGraphTrial(){this._pendingPresetGraphTrial=null,this._hoveredPresetGraphTrial=null,this._focusedPresetGraphTrial=null,this._setPresetGraphTrial(null),this._lastPresetPointerType=null}_dismissCoach(t){const e=t instanceof KeyboardEvent&&"Escape"===t.key?t.composedPath():null;this._cancelGripHint(),this._coach.dismiss(),this.updateComplete.then(()=>{if(e){const t=this._activeFocusPath().at(-1);if(t&&t!==document.body&&t.isConnected&&!e.includes(t))return}this._focusHelpButton()})}_toggleCoach(){!this._isAdmin||this._saving||this._cancelAnimating||this._membershipLocked||("inactive"===this._coach.phase?(this._coach.toggle(this._isDirty),"inactive"!==this._coach.phase&&this._playGripHint()):this._dismissCoach())}_rememberPresetPointer(t){this._lastPresetPointerType=t.pointerType}_startPresetGraphTrial(t,e){if(this._invitation.curve)return;"touch"!==(e&&"pointerType"in e?String(e.pointerType):this._lastPresetPointerType)&&(this._canShowPresetGraphTrial||this._drawIn)&&(this._coach.stopShimmer(),"pointerenter"===e?.type&&(this._hoveredPresetGraphTrial=t),"focus"===e?.type&&(this._focusedPresetGraphTrial=t),this._drawIn?this._pendingPresetGraphTrial=t:this._canShowPresetGraphTrial&&this._setPresetGraphTrial(t))}_endPresetGraphTrial(t,e){"blur"===e.type?this._focusedPresetGraphTrial?.id===t.id&&(this._focusedPresetGraphTrial=null):this._hoveredPresetGraphTrial?.id===t.id&&(this._hoveredPresetGraphTrial=null),this._lastPresetPointerType=null;const i=this._hoveredPresetGraphTrial??this._focusedPresetGraphTrial;i?this._startPresetGraphTrial(i):this._clearPresetGraphTrial()}_applyPreset(t){if(this._dismissInvitation(),this._cancelAnimating||this._saving||this._membershipLocked)return;this.renderRoot.querySelector("curve-graph")?.cancelInteraction(),this._completeDragMaybeReload();const e=this._selectedCurve;if(!e)return void this._clearPresetGraphTrial();this._requestEdit();const i=e.entityId,s=Ie(this._curves,i,t.controlPoints);if(this._clearPresetGraphTrial(),we(s,this._curves))return;const r=Zt(this._joy,"ripple")?this._shownShape(e):null;this._commitCurveEdit(s),this._startRipple(i,r),this._coach.afterEdit()}get _liveRipple(){const t=this._ripple,e=t&&this._curves.find(e=>e.entityId===t.entityId);return t&&e?.controlPoints===t.committed?t:null}_shownShape(t){const e=this._liveRipple;return e?.entityId===t.entityId?e.shown:re(t.controlPoints)}_startRipple(t,e){if(this._stopRipple(),!e)return;const i=this._curves.find(e=>e.entityId===t)?.controlPoints;if(!i)return;const s=ce(e,re(i));this._ripple={entityId:t,committed:i,shown:_e(s,0)},this._cancelRippleLoop=Qt(ue(s),e=>{this._liveRipple&&!Jt()?this._ripple={entityId:t,committed:i,shown:_e(s,e)}:this._stopRipple()},()=>this._stopRipple())}_stopRipple(){this._cancelRippleLoop?.(),this._cancelRippleLoop=null,this._ripple=null}get _curveFrame(){if(this._invitation.curveFrame)return this._invitation.curveFrame;const t=this._morphLine;if(t)return{entityId:t.entityId,pieces:ge(t.from,t.to,t.t),knots:null};const e=this._liveRipple;return e?{entityId:e.entityId,pieces:e.shown.pieces,knots:ve(e.committed,e.shown)}:null}_matchingPresetId(t){return ft.find(e=>je(t,e))?.id??null}_presetChipLabel(t){return mt.presets.chipLabels[t.id]??t.name}_renderPresetSparkline(t){return W`
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
    `}_renderShapeChips(){const t=this._selectedCurve;if(!t||!this._isAdmin||this._membershipLocked)return K;if(!this._editLayout&&!this._invitation.curve&&"inactive"===this._coach.phase)return K;const e=this._matchingPresetId(t),i=this._isShowingPresetGraphTrial?this._presetGraphTrial?.id:null;return W`
      <div class="shape-chip-bar" role="group" aria-label=${mt.presets.panelAria}>
        ${ft.map(s=>{const r=i===s.id,n=this._invitation.presetHighlighted&&s.id===this._invitation.presetId,o=!this._invitation.curve&&(r||!i&&e===s.id);return W`
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
    `}_storedStateKey(t){return`lightener:curve-card:v1:${t}`}_readStoredState(t){try{const e=sessionStorage.getItem(this._storedStateKey(t));if(!e)return null;const i=JSON.parse(e),s="string"==typeof i.selectedCurveId||null===i.selectedCurveId?i.selectedCurveId:null;let r=null;return"number"==typeof i.scrubberPosition&&isFinite(i.scrubberPosition)&&(r=Math.round(Math.min(100,Math.max(0,i.scrubberPosition)))),{selectedCurveId:s,scrubberPosition:r}}catch{return null}}_writeStoredState(t,e){t===this._entityId&&(this._sessionStateInitialized=!0);try{const i={...this._readStoredState(t)??{selectedCurveId:null,scrubberPosition:null},...e};sessionStorage.setItem(this._storedStateKey(t),JSON.stringify(i))}catch{}}_onKeyDown(t){const e=t.composedPath(),i=e.find(t=>t instanceof HTMLElement&&ns.has(t)),s=i?ns.get(i):e.find(t=>t instanceof cs);if("Escape"===t.key){if(t.defaultPrevented||s!==this)return;return void(this._invitation.curve?(t.preventDefault(),this.canvasHelp?this._closeCanvasHelp():this._dismissInvitation()):this._presetGraphTrial?(t.preventDefault(),this._clearPresetGraphTrial()):"inactive"!==this._coach.phase?(t.preventDefault(),e.some(t=>t instanceof Element&&t.classList.contains("coach-prompt"))?this._dismissCoach(t):this._coach.dismiss()):this._escapeLeavesEditStep(e)&&(t.preventDefault(),null!==this._selectedCurveId?this._clearSelection():this.exitEditMode()))}if(t.defaultPrevented||s!==this||t.isComposing||t.altKey||t.shiftKey||!t.ctrlKey&&!t.metaKey)return;if(e.some(t=>t instanceof HTMLElement&&(t.isContentEditable||t.hasAttribute("contenteditable")&&"false"!==t.getAttribute("contenteditable")||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t instanceof HTMLInputElement&&"range"!==t.type)))return;const r=t.key.toLowerCase();"s"===r&&(t.preventDefault(),this._canEditCurves&&this._isDirty&&this._onSave()),"z"===r&&this._canUndoCurves&&this._undoStack.length>0&&(t.preventDefault(),this._undo())}_escapeLeavesEditStep(t){return!(!this.editMode||!this._isAdmin)&&(!(this._membershipOpen||this._saveReview||this._moreOpen)&&(!this.renderRoot.querySelector("curve-legend")?.confirmingDelete&&(!t.some(t=>t instanceof HTMLElement&&(t.isContentEditable||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t instanceof HTMLInputElement&&"range"!==t.type))&&(null!==this._selectedCurveId||!this._isDirty&&!this._saving&&!this._cancelAnimating))))}_onBeforeUnload(t){this._isDirty&&(t.preventDefault(),t.returnValue="")}async _tryLoadCurves(){if(this._draftAuthStale)return;const t=this._contextGeneration;if(!function(t,e){return!(t.loaded&&t.loadedEntityId===e||t.loading)}(this._load,this._entityId))return;if(!this._hass||!this._entityId){if(0===this._curves.length){const t=[{entityId:"light.ceiling_light",friendlyName:"Ceiling Light",controlPoints:[{lightener:0,target:0},{lightener:20,target:0},{lightener:60,target:80},{lightener:100,target:100}],color:Ht[0]},{entityId:"light.sofa_lamp",friendlyName:"Sofa Lamp",controlPoints:[{lightener:0,target:0},{lightener:10,target:50},{lightener:40,target:100},{lightener:70,target:100},{lightener:100,target:60}],color:Ht[1]},{entityId:"light.led_strip",friendlyName:"LED Strip",controlPoints:[{lightener:0,target:0},{lightener:1,target:1},{lightener:100,target:100}],color:Ht[2]}];this._curves=t,this._originalCurves=be(t),this._cleanVersion=this._dirtyVersion}return}const e=++this._loadGeneration;this._load=function(t){return{...t,loadError:null,loading:!0}}(this._load);const i=this._entityId;try{const s=await this._hass.callWS({type:"lightener/get_curves",entity_id:i});if(t!==this._contextGeneration||e!==this._loadGeneration)return;if(!ze(s.entities))throw new Error(mt.guardedSave.invalidResponse);const r=qe(s);if(this._membershipBaseline)return this._load={...this._load,loaded:!0,loadedEntityId:i},r?Ve(r.entities,this._membershipBaseline)?(this._baseline=r,this._rawBaseline=r.entities,this._membershipBaseline=null,this._saveIssue=null,void(this._load={...this._load,loaded:!0,loadedEntityId:i})):void(this._saveIssue="conflict"):void(this._saveIssue="incompatible");const{state:n,action:o}=function(t,e,i,s){return i!==e?{state:t,action:"discard"}:t.reloadAfterLoadEntityId===e?{state:t,action:"run-queued-reload"}:s?{state:{...t,pendingReloadEntityId:e,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"defer-dirty"}:{state:{...t,pendingReloadEntityId:void 0,loaded:!0,loadedEntityId:e,loadErrorEntityId:void 0},action:"apply"}}(this._load,i,this._entityId,this._isDirty);let a;if("apply"!==o&&"defer-dirty"!==o||(a=fe(s.entities,this._hass.states,Ht)),this._load=n,("apply"===o||"defer-dirty"===o)&&"apply"===o&&a){if(this._endLightGesture(!1),this._curves=a,this._originalCurves=be(a),this._baseline=r,this._verifyAfterDiscard&&r&&(this._draftLost=!1,this._resumeUnverified=!1,this._verifyAfterDiscard=!1,this._draftNotice=null),r&&(this._knownEntryId=r.config_entry_id),this._subscribeDraft(),this._rawBaseline=structuredClone(s.entities),this._saveIssue=this._isAdmin?r?null:"incompatible":"readonly",this._cleanVersion=this._dirtyVersion,!this._sessionStateInitialized&&this._curves.length>0&&null===this._selectedCurveId&&null===this._scrubberPosition){this._sessionStateInitialized=!0;const t=this._readStoredState(i);this._invitationAutoAllowed=this.experimentalFirstUse&&!0===this._config.firstRun&&!t&&!function(t){if(Pe.has(t))return!0;try{return null!==localStorage.getItem(Ae(t))}catch{return!1}}(i)&&Re(this._curves),t?(null!==t.selectedCurveId&&xe(this._curves,t.selectedCurveId)&&(this._selectedCurveId=t.selectedCurveId),null!==t.scrubberPosition&&(this._scrubberPosition=t.scrubberPosition)):this._invitationAutoAllowed?this._selectedCurveId=this._invitationTarget?.entityId??null:!0===this._config.firstRun&&"choose_shape"===this._coach.phase&&(this._selectedCurveId=this._curves[0].entityId,this._writeStoredState(i,{selectedCurveId:this._selectedCurveId}))}this.updateComplete.then(()=>this._coach.maybeStartShimmer())}}catch(s){if(t!==this._contextGeneration||e!==this._loadGeneration)return;const{state:r,discarded:n}=function(t,e,i,s){return i!==e?{state:t,discarded:!0}:{state:{...t,loadError:s,loaded:!0,loadedEntityId:e,loadErrorEntityId:e},discarded:!1}}(this._load,i,this._entityId,String(s));this._load=r,n||console.error("[Lightener] Failed to load curves:",s)}finally{if(t!==this._contextGeneration||e!==this._loadGeneration)return;const{state:s,followUp:r}=function(t,e,i){const s={...t,loading:!1};return i!==e?{state:s,followUp:"reload-changed-entity"}:t.reloadAfterLoadEntityId===e?{state:{...s,reloadAfterLoadEntityId:void 0,loaded:!1},followUp:"run-queued-reload"}:{state:s,followUp:"none"}}(this._load,i,this._entityId);this._load=s,"none"!==r&&this._tryLoadCurves()}}_onScrubberMove(t){if(!this._canEditCurves||!Number.isFinite(t.detail.position))return;this._endLightGesture(),this._dismissInvitation(),this._invitationTogether=!1,this._clearPresetGraphTrial();const e=Math.min(100,Math.max(0,t.detail.position));this._scrubberPosition=e,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{scrubberPosition:e}),this._previewActive&&this._previewLights(e)}_onScrubberStart(){this._endLightGesture(),this._dismissInvitation()}_onScrubberEnd(){this._ackWatch()}async _settlePreviewForMembership(){const t=this._contextGeneration;return await this._previewController.stop(),!(t!==this._contextGeneration||!this.isConnected)&&(this._previewController.mutationBlocked?(this._manageError=mt.restoration.operationBlocked,!1):!this._previewController.blocked||(this._manageError=mt.restoration.membershipBlocked,!1))}_refreshActivePreview(t=!1){this._previewController.refresh(t)}_previewLights(t,e=!1){this._previewController.previewLights(t,e)}_previewSingleLight(t,e,i=!1,s){this._previewController.previewSingleLight(t,e,i,s)}_onSelectCurve(t){if(this._endLightGesture(),this._dismissInvitation(),this._hoveredCurveId!==t.detail.entityId&&(this._hoveredCurveId=null),this._cancelAnimating)return;const{entityId:e}=t.detail;(e===this._selectedCurveId||xe(this._curves,e))&&(this._clearPresetGraphTrial(),this._selectedCurveId=function(t,e){return t===e?null:e}(this._selectedCurveId,e),null!==this._selectedCurveId&&this._requestEdit(),this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onHoverCurve(t){const{entityId:e}=t.detail;this._hoveredCurveId=null!==e&&this._curves.some(t=>t.entityId===e)?e:null}_clearSelection(){const t=this._selectedCurveId;null!==t&&this._onSelectCurve(new CustomEvent("select-curve",{detail:{entityId:t}}))}_onFocusCurve(t){if(this._endLightGesture(),this._hoveredCurveId!==t.detail.entityId&&(this._hoveredCurveId=null),this._invitation.curve&&t.detail.entityId===this._selectedCurveId)return void this._invitation.freeze();if(this._dismissInvitation(),this._cancelAnimating)return;const{entityId:e}=t.detail;xe(this._curves,e)&&(this._clearPresetGraphTrial(),this._selectedCurveId=e,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId}))}_onLightRowFocus(t){this._onFocusCurve(t),this._selectedCurveId===t.detail.entityId&&this._requestEdit()}_onLightLevelStart(t){this._endLightGesture(),this.renderRoot.querySelector("curve-graph")?.cancelInteraction(),this._completeDragMaybeReload(),this._dismissInvitation();const{entityId:e}=t.detail,i=Math.round(this._effectiveScrubberPosition);if(!this._canEditCurves||this._load.loading||!this._entityId||this._load.loadedEntityId!==this._entityId||i<=0||!xe(this._curves,e))return;this._onFocusCurve(t),this._holdEditLayout(),this._requestEdit(),this._stopRipple();const s=this._curves.find(t=>t.entityId===e).controlPoints;this._editGesture={kind:"light",undoPushed:!1,entityId:e,groupId:this._entityId,position:i,roomValue:this._effectiveScrubberPosition,startingPoints:s.map(t=>({...t})),startingTarget:Dt(s,i),dirtyVersion:this._dirtyVersion,undoStack:this._undoStack.slice()}}_onLightLevelInput(t){const e=this._lightGesture;if(!e||t.detail.entityId!==e.entityId)return;if(!this._canEditCurves||this._load.loading||e.groupId!==this._entityId||e.roomValue!==this._effectiveScrubberPosition||!xe(this._curves,e.entityId))return void this._endLightGesture();const i=t.detail.target;if(!Number.isFinite(i))return;const s=i===e.startingTarget,r=this._curves.find(t=>t.entityId===e.entityId),n=s?je(r,{controlPoints:e.startingPoints})?null:this._curves.map(t=>t.entityId===e.entityId?{...t,controlPoints:e.startingPoints.map(t=>({...t}))}:t):function(t,e,i,s){if(!Number.isFinite(i)||!Number.isFinite(s))return null;const r=t.findIndex(t=>t.entityId===e);if(r<0)return null;const n=t[r],o=Math.round(Tt(i,0,100)),a=Math.round(Tt(s,0,100)),h=n.controlPoints.find(t=>t.lightener===o);if(h?.target===a)return null;if(!h&&Dt(n.controlPoints,o)===a)return null;const l=n.controlPoints.map(t=>({...t}));return h?l.find(t=>t.lightener===o).target=a:l.push({lightener:o,target:a}),l.sort((t,e)=>t.lightener-e.lightener),t.map((t,e)=>e===r?{...n,controlPoints:l}:t)}(this._curves,e.entityId,e.position,i);n&&(this._commitGestureEdit(n),this._coach.afterEdit(),this._previewSingleLight(e.entityId,e.position,!1,s?e.startingTarget:Math.round(Math.min(100,Math.max(0,i)))))}_onLightLevelEnd(t){this._releaseEditLayout(),t.detail.entityId===this._lightGesture?.entityId&&this._endLightGesture()}_endLightGesture(t=!0){this._lightGesture&&(t?this._completeDragMaybeReload():(this._restoreNetZeroLightGesture(),this._editGesture=null))}_restoreNetZeroLightGesture(){const t=this._lightGesture;if(!t?.undoPushed)return;const e=this._curves.find(e=>e.entityId===t.entityId)?.controlPoints;e&&je({controlPoints:e},{controlPoints:t.startingPoints})&&(this._dirtyVersion=t.dirtyVersion,this._undoStack=t.undoStack,this._isDirty||this._coach.afterClean(),this._curves=[...this._curves])}_commitGestureEdit(t){this._suppressDraftCapture=!1;const e=this._editGesture??={kind:"point",undoPushed:!1},i=!e.undoPushed;i&&(this._pushUndo(),e.undoPushed=!0),this._curves=t,this._dirtyVersion++,i&&this._checkpointDraft()}_pushUndo(){$e(this._undoStack,this._curves)}_commitCurveEdit(t){this._suppressDraftCapture=!1,this._pushUndo(),this._curves=t,this._dirtyVersion++,this._checkpointDraft(),this._refreshActivePreview(!0),this._ackWatch()}_dismissWatchHint(t=!0){this._clearWatchHintTimer(),function(){mi=!0;try{localStorage.setItem(gi,"dismissed")}catch{}}(),this._watchHintDismissed=!0,t&&this.updateComplete.then(()=>this._commandButtons().get("preview-toggle-btn")?.focus({preventScroll:!0}))}_clearWatchHintTimer(){null!==this._watchHintTimer&&clearTimeout(this._watchHintTimer),this._watchHintTimer=null}_syncWatchHintTimer(){if("snackbar"!==this._watchHintMode)return this._clearWatchHintTimer();null===this._watchHintTimer&&(this._watchHintTimer=setTimeout(()=>{this._watchHintTimer=null;const t=this.renderRoot.activeElement;"snackbar"===this._watchHintMode&&this._dismissWatchHint(!!t?.closest(".watch-hint"))},6e3))}_ackWatch(){this._previewActive&&this._watchAck++}_completeDragMaybeReload(){this._restoreNetZeroLightGesture(),this._editGesture=null,this._checkpointDraft(),this._ackWatch(),this.isConnected&&!this._load.loaded&&this._hass&&this._tryLoadCurves()}_undo(){this._endLightGesture(),this._dismissInvitation(),this._canUndoCurves&&0!==this._undoStack.length&&(this._dirtyVersion++,this._clearPresetGraphTrial(),this._animateCurvesTo(this._undoStack.pop(),()=>{this._refreshActivePreview(!0),this._ackWatch()}))}_stopCurveAnimation(){this._curveAnimationGeneration++,null!==this._cancelAnimFrame&&cancelAnimationFrame(this._cancelAnimFrame),this._cancelAnimFrame=null,this._cancelAnimating=!1,this._morphLine=null}_activeFocusPath(){const t=[];let e=document.activeElement;for(;e;)t.push(e),e=e.shadowRoot?.activeElement??null;return t}_retainAnimationFocus(){const t=this._activeFocusPath(),e=t.at(-1),i=t.some(t=>this._activeToolbarHost?.contains(t));if(!e||!t.includes(this)&&!i)return;const s=[...this._commandButtons()].find(([,t])=>t===e)?.[0]??(e.classList.contains("preview-toggle-btn")?"preview-toggle-btn":void 0),r=this.renderRoot.querySelector("curve-legend")?.renderRoot;if(!(r?.contains(e)&&e.matches(".delete-group-btn")||e.matches(".add-light-btn, .delete-group-btn")&&!!e.closest(".more-menu"))&&!e.classList.contains("hit-circle")&&!(e instanceof HTMLInputElement&&"range"===e.type)&&(!s||"btn-undo"===s&&this._undoStack.length>0||"preview-toggle-btn"===s&&this._previewActive))return;const n=t.reduceRight((t,e)=>t??e.closest(".editor-toolbar, .edit-row, .message-line"),null),o=t.map(t=>t.closest(".exit-slot")).find(Boolean)??n??this.renderRoot.querySelector(".card");o?.focus({preventScroll:!0})}_animateCurvesTo(t,e){const i=be(this._curves),s=this._curveFrame,r=s&&t.find(t=>t.entityId===s.entityId),n=s&&r?{entityId:s.entityId,from:s.pieces,to:re(r.controlPoints).pieces}:null;this._stopCurveAnimation();const o=this._curveAnimationGeneration;this._retainAnimationFocus(),this._stopRipple(),this._morphLine=n?{...n,t:0}:null,this._cancelAnimating=!0;const a=performance.now(),h=s=>{if(o!==this._curveAnimationGeneration)return;const r=Math.max(0,s-a),l=Math.min(r/300,1),d=zt(l);this._morphLine=n&&l<1?{...n,t:Math.max(d,0)}:null;const c=t.map((t,e)=>{const s=i[e];if(!s)return t;const r=s.controlPoints,n=t.controlPoints,o=function(t,e,i){const s=Math.min(t.length,e.length),r=[];for(let n=0;n<s;n++)r.push({lightener:Math.round(t[n].lightener+(e[n].lightener-t[n].lightener)*i),target:Math.round(t[n].target+(e[n].target-t[n].target)*i)});return r}(r,n,d);if(n.length>o.length&&l>=1)for(let t=o.length;t<n.length;t++)o.push({...n[t]});if(r.length>o.length&&l<1)for(let t=o.length;t<r.length;t++)o.push({...r[t]});return o.sort((t,e)=>t.lightener-e.lightener),{...t,controlPoints:o}});if(this._curves=c,l<1)this._cancelAnimFrame=requestAnimationFrame(h);else{this._curves=t.map(t=>({...t})),this._cancelAnimating=!1,this._cancelAnimFrame=null;const i=we(this._curves,this._originalCurves);i&&(this._cleanVersion=this._dirtyVersion,this._coach.afterClean()),e?.(),this._checkpointDraft(),i&&this._reloadPendingDirtyResponse()}};this._cancelAnimFrame=requestAnimationFrame(h)}_onPointMove(t){if(!this._canEditCurves)return;this._holdEditLayout(),this._requestEdit(),this._endLightGesture(),this._clearPresetGraphTrial();const{curveIndex:e,pointIndex:i,lightener:s,target:r}=t.detail,n=this._graphCurves,o=n[e]?.controlPoints[i];if(o?.lightener===s&&o.target===r)return;const a=ke(n,e,i,s,r);if(null===a)return;const h=this._curves[e];h&&this._selectedCurveId!==h.entityId&&(this._selectedCurveId=h.entityId,this._storageEntityId&&this._writeStoredState(this._storageEntityId,{selectedCurveId:this._selectedCurveId})),this._commitGestureEdit(a),this._finishInvitation(),this._coach.afterEdit(),h?this._previewSingleLight(h.entityId,s,!1,r):this._refreshActivePreview()}_onPointDrop(t){this._releaseEditLayout(),this._lightGesture||this._completeDragMaybeReload()}_onPointAdd(t){if(!this._canEditCurves)return;this._requestEdit(),this._endLightGesture(),this._clearPresetGraphTrial();const{lightener:e,target:i,entityId:s}=t.detail,r=s??this._selectedCurveId;if(!r)return;const n=Se(this._graphCurves,r,e,i);null!==n&&(this._commitCurveEdit(n),this._finishInvitation(),this._coach.afterEdit())}_onPointRemove(t){if(!this._canEditCurves)return;this._requestEdit(),this._endLightGesture(),this._clearPresetGraphTrial(),this._completeDragMaybeReload();const{curveIndex:e,pointIndex:i}=t.detail,s=Ce(this._graphCurves,e,i);null!==s&&(this._commitCurveEdit(s),this._finishInvitation(),this._coach.afterEdit())}async _onDeleteGroup(){if(!this._hass||!this._entityId||this._managingLights||this._runtimeBlocked)return;if(this._clearPresetGraphTrial(),(this._previewActive||this._previewController.blocked)&&!await this._settlePreviewForMembership())return;if(!this._isAdmin||this._runtimeBlocked||this._managingLights)return;const t=this._contextGeneration,e=this._entityId;this._manageError=null,this._managingLights=!0;try{const i=await this._hass.callWS({type:"config/entity_registry/get",entity_id:e});if(i?.platform!==Ge)throw new rs(mt.legend.deleteWrongGroup);const s=i?.config_entry_id;if(!s)throw new rs(mt.legend.deleteMissingEntry);if(t!==this._contextGeneration||!this.isConnected||!this._isAdmin||this._runtimeBlocked||this._previewController.blocked)return;const r=this._previewController.beginMutation([]);if(!r)return void(this._manageError=mt.restoration.membershipBlocked);if(await this._hass.callApi("DELETE",`config/config_entries/entry/${s}`),r(),t!==this._contextGeneration||!this.isConnected||this._authInvalidated||!this._isAdmin||this._runtimeBlocked)return;this.discardNavigationDraft(),this._curves=[],this._originalCurves=[],this._undoStack=[],this._load={...this._load,loaded:!0,loadedEntityId:e,loadError:null,loadErrorEntityId:void 0},this._selectedCurveId=null,this._writeStoredState(e,{selectedCurveId:null}),this._groupDeleted=!0,this.dispatchEvent(new CustomEvent("lightener-group-deleted",{detail:{entityId:e,configEntryId:s},bubbles:!0,composed:!0}))}catch(e){console.error("[Lightener] Failed to delete group:",e),t===this._contextGeneration&&this.isConnected&&!this._authInvalidated&&(this._manageError=e instanceof rs?e.message:mt.legend.deleteError)}finally{t===this._contextGeneration&&(this._managingLights=!1)}}async _openMembershipEditor(){this._dismissInvitation(),this._canManageLights&&(this._hoveredCurveId=null,this._coach.interrupt(),this._clearPresetGraphTrial(),(!this._previewActive&&!this._previewController.blocked||await this._settlePreviewForMembership())&&this._canManageLights&&(this._manageError=null,this._clearMembershipStatus(),this._setMembershipOpen(!0)))}_closeMembershipEditor(){return this._setMembershipOpen(!1),(async()=>{if(await this.updateComplete,this._membershipOpen)return;const t=this.renderRoot.querySelector("curve-legend");await(t?.updateComplete),!this._membershipOpen&&this.isConnected&&this._focusMoreButton()})().catch(t=>this._reportMembershipFocusRestoreError(t))}_reportMembershipFocusRestoreError(t){console.warn("[Lightener] Could not restore focus after closing Edit lights:",t)}_onMembershipApplied(t){if(!this._hass)return;const e=t.detail;this._baseline=null,this._membershipBaseline=structuredClone(e.entities),this._rawBaseline=structuredClone(e.entities),this._saveIssue=null;const i=new Set(this._curves.map(t=>t.entityId)),s=this._curves,r=this._selectedCurveId;this._stopDrawIn(),this._stopDrawOut(),this._curves=fe(e.entities,this._hass.states,Ht);const n=new Set(this._curves.map(t=>t.entityId)),o=s.flatMap((t,e)=>n.has(t.entityId)?[]:[{curve:t,index:e}]);this._originalCurves=be(this._curves);const a=new Set(this._curves.filter(t=>!i.has(t.entityId)).map(t=>t.entityId));this._cleanVersion=this._dirtyVersion,this._undoStack=[];const h=(e.added_entity_ids??[]).find(t=>this._curves.some(e=>e.entityId===t));h?this._selectedCurveId=h:null===this._selectedCurveId||this._curves.some(t=>t.entityId===this._selectedCurveId)||(this._selectedCurveId=null),this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:this._selectedCurveId}),this._bindMembershipBaseline(),this._showMembershipStatus();const l=this._closeMembershipEditor();if(a.size>0&&this.isConnected&&Zt(this._joy,"draw_in")){this._startDrawIn(a);const t=this._drawIn.token;l.then(()=>{this._drawIn?.token===t&&!this._membershipOpen&&this.isConnected&&(this._drawIn={...this._drawIn,ready:!0})})}o.length>0&&this.isConnected&&Zt(this._joy,"draw_in")&&(this._drawOut={token:++this._drawOutToken,curves:o,selectedCurveId:r},this._drawOutTimer=setTimeout(()=>this._stopDrawOut(),560))}async _bindMembershipBaseline(){if(!this._hass||!this._entityId||!this._membershipBaseline)return;const t=this._entityId,e=this._contextGeneration,i=++this._loadGeneration,s=this._membershipBaseline;this._load={...this._load,loading:!1,loaded:!0,loadedEntityId:t};const r=()=>e===this._contextGeneration&&i===this._loadGeneration;try{const e=await this._hass.callWS({type:"lightener/get_curves",entity_id:t});if(!r())return;const i=qe(e);if(!i)return void(this._saveIssue="incompatible");if(!Ve(i.entities,s))return void(this._saveIssue="conflict");this._baseline=i,this._rawBaseline=i.entities,this._membershipBaseline=null,this._saveIssue=null,this._checkpointDraft()}catch(t){if(!r())return;this._saveIssue="not_found"===t?.code?"not_found":"reread","not_found"===this._saveIssue&&(this._groupDeleted=!0),this._saveState={phase:"error",message:mt.guardedSave.readFailed}}}_stopDrawOut(){null!==this._drawOutTimer&&clearTimeout(this._drawOutTimer),this._drawOutTimer=null,this._drawOut=null}_startDrawIn(t){this._stopDrawIn(),this._drawIn={ids:t,token:++this._drawInToken,ready:!1},this._drawInWaitingForVisible=!0,this._unsubscribeDrawInMotion=Xt(this._boundStopDrawIn),this.addEventListener("pointerdown",this._boundStopDrawIn,!0),this.addEventListener("keydown",this._boundStopDrawIn,!0),this.addEventListener("click",this._boundStopDrawIn,!0)}_stopDrawIn(){null!==this._drawInTimer&&clearTimeout(this._drawInTimer),this._drawInTimer=null,this._unsubscribeDrawInMotion?.(),this._unsubscribeDrawInMotion=null,this.removeEventListener("pointerdown",this._boundStopDrawIn,!0),this.removeEventListener("keydown",this._boundStopDrawIn,!0),this.removeEventListener("click",this._boundStopDrawIn,!0),this._drawInWaitingForVisible=!1,this._drawIn=null;const t=this._pendingPresetGraphTrial;this._pendingPresetGraphTrial=null,t&&this.isConnected&&this._canShowPresetGraphTrial&&this._startPresetGraphTrial(t)}_showMembershipStatus(){this._clearMembershipStatus(),"error"!==this._saveState.phase&&this._dispatchSave({type:"reset"}),this._membershipStatus=mt.membership.updated,this._membershipStatusTimer=window.setTimeout(()=>{this._membershipStatusTimer=null,this._membershipStatus=null},2e3)}_clearMembershipStatus(){null!==this._membershipStatusTimer&&(window.clearTimeout(this._membershipStatusTimer),this._membershipStatusTimer=null),this._membershipStatus=null}_setMembershipOpen(t){t&&this._endLightGesture(),this._membershipOpen!==t&&(this._membershipOpen=t,this.dispatchEvent(new CustomEvent("lightener-membership-state",{detail:{open:t},bubbles:!0,composed:!0})))}async saveCurves(){return this._onSave()}_guardedSaveFailure(t){const e=t?.code??"",i={conflict:["refused","conflict",mt.guardedSave.conflict],precondition_required:["refused","refresh",mt.guardedSave.refresh],not_found:["refused","not_found",mt.guardedSave.notFound],unknown_entities:["refused","conflict",mt.guardedSave.unknownEntities],invalid_format:["refused",null,mt.guardedSave.invalid],unauthorized:["refused",null,mt.guardedSave.unauthorized],reload_failed:["refused","reread",mt.guardedSave.rolledBack],rollback_reload_failed:["runtime","runtime",mt.guardedSave.runtime]},[s,r,n]=i[e]??["unknown","uncertain",mt.guardedSave.uncertain];return{disposition:s,issue:r,message:n,deleted:"not_found"===e}}async _onSave(){if(this._endLightGesture(),this._dismissInvitation(),!(this._hass&&this._entityId&&this._canGuardedSave&&this._baseline))return!1;this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview();const t=this._entityId,e=this._contextGeneration,i=this._baseline,s=this._dirtyVersion,r=be(this._curves),n=me(Ke(this._originalCurves,r)),o=Ye(i.entities,n);if(this._checkpointDraft(),this._draftLost)return!1;const a=this._draftClaim?{...this._draftClaim}:null,h=this._claimedScope?{...this._claimedScope}:null,l=this._identityAvailable?this._draftPrincipal:null,d=crypto.randomUUID();l&&(ni.beginWrite(l,i.config_entry_id,d),this._pendingDraftWrite={principal:l,entry:i.config_entry_id,id:d}),this._submittedIntent=o;const c=this._editRequests;this._dispatchSave({type:"save-start"});const{generation:p,settled:u}=this._saveGuard.arm(),_=()=>e===this._contextGeneration&&t===this._entityId&&this.isConnected;try{const e=await Promise.race([this._hass.callWS({type:"lightener/save_curves",entity_id:t,expected_revision:i.revision,curves:n}).then(t=>{const e=qe(t,!0);return l&&e&&e.config_entry_id===i.config_entry_id&&Ve(e.entities,o)?ni.settleWrite(l,i.config_entry_id,d,"confirmed"):l&&ni.settleWrite(l,i.config_entry_id,d,"unknown"),{value:t}}).catch(t=>{const e=this._guardedSaveFailure(t);throw l&&ni.settleWrite(l,i.config_entry_id,d,e.disposition),"runtime"!==e.disposition||l&&!ni.isCurrent(l)||(l||this._identityUnavailableRuntimeEntries.add(i.config_entry_id),this._baseline?.config_entry_id===i.config_entry_id&&this._previewActive&&this._stopPreview(),this.requestUpdate()),t}),u.then(()=>({timeout:!0}))]);if(!_())return!1;if("timeout"in e)return this._saveIssue="uncertain",l&&ni.settleWrite(l,i.config_entry_id,d,"unknown"),this._checkpointDraft(),!1;const v=qe(e.value,!0);if(!v||v.config_entry_id!==i.config_entry_id||!Ve(v.entities,o))throw{code:"uncertain"};if(this._dirtyVersion!==s||!we(this._curves,r))throw{code:"uncertain"};this._loadGeneration++,this._load={...this._load,loading:!1,loaded:!0,loadedEntityId:t,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0};const g=fe(v.entities,this._hass.states,Ht);return this._baseline=v,this._rawBaseline=v.entities,this._curves=g,this._originalCurves=be(g),this._cleanVersion=this._dirtyVersion,this._undoStack=[],this._submittedIntent=null,this._saveIssue=null,this._dispatchSave({type:"save-success"}),this._saveGuard.confirm(p),h&&a&&ni.clear(h,a),this._draftClaim?.draftId===a?.draftId&&(this._draftClaim=null,this._claimedScope=null),this._coach.afterSave(),this._editRequests===c&&this._returnToView(),!0}catch(t){if(!_())return!1;const e=this._guardedSaveFailure(t);return this._saveIssue=e.issue,e.deleted&&(this._groupDeleted=!0),this._saveGuard.fail(p,e.message),this._checkpointDraft(),!1}}async _reviewLatest(){if(this._writeReview={kind:"required"},!this._hass||!this._entityId||!this._isAdmin||this._savedRead||this._runtimeBlocked)return;this._endLightGesture();const t=this._beginSavedRead();this._loadGeneration++,this._load={...this._load,loading:!1};const e=()=>this._ownsSavedRead(t)&&this.isConnected&&this._isAdmin;try{const t=await this._readLatestSaved(e,this._knownEntryId,mt.guardedSave.incompatibleRead);if(!t?.valid())return;const{latest:i,curves:s,writeReview:r}=t;if("uncertain"===this._saveIssue&&this._submittedIntent&&Ve(i.entities,this._submittedIntent)&&Ve(Ye(this._rawBaseline,me(Ke(this._originalCurves,this._curves))),this._submittedIntent))return this._installRecovery(i,s,s),void(this._saveState={phase:"error",message:mt.guardedSave.present});this._saveReview={writeReview:r,latest:i,curves:s,members:Je(this._originalCurves,this._curves,s)}}catch(t){if(!e())return;"not_found"===t?.code&&(this._groupDeleted=!0,this._saveIssue="not_found"),this._saveState={phase:"error",message:t instanceof rs?t.message:mt.guardedSave.readFailed}}finally{this._finishSavedRead(t)}}_installRecovery(t,e,i){this._stopCurveAnimation(),this._stopDrawIn(),this._stopDrawOut(),this._stopRipple(),this._baseline=t,this._knownEntryId=t.config_entry_id,this._subscribeDraft(),this._rawBaseline=t.entities,this._membershipBaseline=null,this._originalCurves=be(e),this._curves=be(i),this._undoStack=we(e,i)?[]:[be(this._originalCurves)],this._dirtyVersion++,this._cleanVersion=we(e,i)?this._dirtyVersion:this._dirtyVersion-1,this._curves.some(t=>t.entityId===this._selectedCurveId)||(this._selectedCurveId=null),this._saveIssue=null,this._submittedIntent=null,this._loadGeneration++,this._load={...this._load,loaded:!0,loading:!1,loadedEntityId:this._entityId,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0,loadError:null},this._dispatchSave({type:"reset"})}_dismissSaveReview(){const t=this._retainedReview;this._retainedReview=null,this._saveReview=null,t&&!t.localCopy&&ni.release(t.scope,t.claim)}_acceptSaveReview(t){const e=this._saveReview;if(!e||!this._isAdmin||this._draftAuthStale||this._runtimeBlocked)return void(this._runtimeBlocked&&this._dismissSaveReview());const i=e.writeReview;if(!this._writeReviewCurrent(i))return this._dismissSaveReview(),void(this._draftNotice=mt.drafts.savedChanged);const s=this._retainedReview;return s&&JSON.stringify(this._draftScope())!==JSON.stringify(s.scope)?(this._dismissSaveReview(),void(this._draftNotice=mt.drafts.changed)):!s||s.localCopy||ni.owns(s.scope,s.claim)?(s&&(this._draftClaim=s.localCopy?null:s.claim,this._claimedScope=s.localCopy?null:s.scope,this._retainedReview=null,this._resumeTicket=null,this._draftLost=!1,s.localCopy&&(this._draftOwner=crypto.randomUUID())),this._writeReview=i?{kind:"accepted",stamp:i}:{kind:"required"},this._resumeUnverified=!1,this._resumePayload=null,this._installRecovery(e.latest,e.curves,function(t,e,i){const s=new Map(e.filter(t=>"removed"!==t.kind&&i.has(t.entityId)).map(t=>[t.entityId,t.local]));return be(t).map(t=>({...t,controlPoints:s.get(t.entityId)?.controlPoints.map(t=>({...t}))??t.controlPoints}))}(e.curves,e.members,t.detail.keep)),this._dismissSaveReview(),void this._checkpointDraft()):(this._dismissSaveReview(),void(this._draftNotice=mt.drafts.changed))}_retryLoad(){this._load=function(t){return{...t,loaded:!1,loadError:null,loadErrorEntityId:void 0,pendingReloadEntityId:void 0,reloadAfterLoadEntityId:void 0}}(this._load),this._tryLoadCurves()}_reloadCurvesAfterCurrentLoad(t){const{state:e,runNow:i}=function(t,e){const i={...t,loaded:!1};return i.loading?{state:{...i,reloadAfterLoadEntityId:e},runNow:!1}:{state:i,runNow:!0}}(this._load,t);this._load=e,i&&this._tryLoadCurves()}_reloadPendingDirtyResponse(){const{state:t,reloadEntityId:e}=function(t,e){const i=t.pendingReloadEntityId;return i&&i===e?{state:{...t,pendingReloadEntityId:void 0},reloadEntityId:i}:{state:t}}(this._load,this._entityId);this._load=t,e&&this._reloadCurvesAfterCurrentLoad(e)}_onCancel(){if(this._endLightGesture(),this._dismissInvitation(),this._cancelAnimating)return;const t=this._draftLost||this._resumeUnverified;this.discardNavigationDraft(),t&&(this._resumeUnverified=!0,this._verifyAfterDiscard=!0),this._clearPresetGraphTrial(),this._previewActive&&this._stopPreview(),this._undoStack=[],this._animateCurvesTo(be(this._originalCurves),()=>{this._selectedCurveId=!0===this._config.firstRun&&"choose_shape"===this._coach.phase?this._curves[0]?.entityId??null:null,this._load.loadedEntityId&&this._writeStoredState(this._load.loadedEntityId,{selectedCurveId:this._selectedCurveId}),this._editRequested=!1,this._dispatchSave({type:"reset"}),this._suppressDraftCapture=!1,t&&this._entityId&&this._reloadCurvesAfterCurrentLoad(this._entityId)})}_renderLoadingSkeleton(){return W`
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
    `}_renderTrialStatus(){return this._isShowingPresetGraphTrial&&this._presetGraphTrial&&this._selectedCurve?W`<span class="graph-insight trial sr-only" role="status" aria-live="polite"
      ><span class="graph-insight-primary"
        >${mt.presets.trying(this._presetGraphTrial.name)}</span
      ></span
    >`:K}_renderMessageInsight(){if(this.experimentalFirstUse){const t=this._selectedCurve?.friendlyName;if(this._invitation.curve||this._invitationEditHint)return W`<div class="graph-insight invitation-insight">
          <span class="graph-insight-primary" title=${t??""}>${t}</span>
          <span class="graph-insight-secondary"
            >${this._invitation.curve?mt.invitation.example:this._invitationEditHint}</span
          >
        </div>`}else if(this.canvasHelp&&(this._invitation.curve||this._invitationEditHint)){const t=this._invitation.curve?this._selectedCurve?.friendlyName:this._invitationEditHint;return W`<div class="graph-insight invitation-insight">
        <span class="graph-insight-primary" title=${t??""}>${t}</span>
      </div>`}if(this._isAdmin&&"inactive"!==this._coach.phase){const t="choose_shape"===this._coach.phase?mt.coach.chooseTitle:"complete"===this._coach.phase?mt.coach.savedTitle:mt.coach.readyTitle,e="choose_shape"===this._coach.phase?mt.coach.chooseBody:"complete"===this._coach.phase?mt.coach.savedBody:mt.coach.readyBody;return W`
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
      `}return K}get _helpKind(){return this.canvasHelp?"canvas":this.experimentalFirstUse?"invitation":"coach"}get _helpLabel(){const t=this._helpKind;return"canvas"===t?mt.canvasHelp.open:"invitation"===t?this._invitation.curve?mt.invitation.dismiss:mt.invitation.replay:mt.coach.help}get _helpAvailable(){if(!this._isAdmin||0===this._curves.length||this._load.loading)return!1;const t=this._helpKind;return"invitation"===t?!!this._invitation.curve||this._canRunInvitation:"coach"!==t||!this._saving&&!this._cancelAnimating&&!this._membershipLocked}_runHelp(){const t=this._helpKind;"canvas"===t?this._toggleCanvasHelp(!!this._invitation.curve):"invitation"===t?this._invitation.curve?this._dismissInvitation():this._startInvitation():this._toggleCoach()}_setMoreOpen(t){this._moreOpen!==t&&(this._moreOpen=t,t?document.addEventListener("pointerdown",this._onMoreOutside,!0):document.removeEventListener("pointerdown",this._onMoreOutside,!0))}_onMoreKeyDown(t){"Escape"===t.key&&this._moreOpen&&(t.preventDefault(),this._setMoreOpen(!1),this.updateComplete.then(()=>this._focusMoreButton()))}_visible(t){const e=[this._activeToolbarHost,this.renderRoot].filter(t=>!!t).flatMap(e=>[...e.querySelectorAll(t)]);return e.find(t=>t.getClientRects().length>0)??e[0]??null}_focusMoreButton(t){this._visible(".more-button")?.focus(t)}_chooseMore(t){this._setMoreOpen(!1),t()}_startDeleteGroup(){this._canManageLights&&this.renderRoot.querySelector("curve-legend")?.startDeleteGroup()}_renderMoreMenu(){const t=this._moreOpen,e=this._isAdmin&&!this._groupDeleted;return W`<div class="more-anchor" @keydown=${this._onMoreKeyDown}>
      <button
        type="button"
        class="more-button invitation-dismiss"
        aria-label=${mt.toolbar.more}
        title=${mt.toolbar.more}
        aria-expanded=${t?"true":"false"}
        aria-controls=${t?"more-menu":K}
        @click=${()=>this._setMoreOpen(!t)}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="12" cy="19" r="1.8"></circle>
        </svg>
      </button>
      ${t?W`<div class="more-menu" id="more-menu" role="group" aria-label=${mt.toolbar.more}>
            <button
              type="button"
              class="more-item show-me-how ${"canvas"===this._helpKind?"canvas-help":""} invitation-dismiss"
              ?disabled=${!this._helpAvailable}
              @click=${()=>this._chooseMore(()=>{this._runHelp(),this.updateComplete.then(()=>this._focusMoreButton({preventScroll:!0}))})}
            >
              ${this._helpLabel}
            </button>
            ${e?W`<button
                  type="button"
                  class="more-item add-light-btn"
                  ?disabled=${!this._canManageLights}
                  @click=${()=>this._chooseMore(()=>{this._openMembershipEditor()})}
                >
                  ${mt.toolbar.editLights}
                </button>`:K}
            ${this.canCreateGroup?W`<button
                  type="button"
                  class="more-item new-group-btn"
                  ?disabled=${this._membershipLocked}
                  @click=${()=>this._chooseMore(()=>this.dispatchEvent(new CustomEvent("lightener-new-group",{bubbles:!0,composed:!0})))}
                >
                  ${mt.toolbar.newGroup}
                </button>`:K}
            ${e?W`<button
                  type="button"
                  class="more-item delete-group-btn"
                  ?disabled=${!this._canManageLights}
                  @click=${()=>this._chooseMore(()=>this._startDeleteGroup())}
                >
                  ${mt.legend.deleteGroup}
                </button>`:K}
          </div>`:K}
    </div>`}_renderExitSlot(){let t=K,e="empty";return this.canvasHelp&&this._invitation.curve?(e="tutorial",t=W`<button
          type="button"
          class="exit-button canvas-replay invitation-dismiss"
          @click=${()=>this._toggleCanvasHelp(!0)}
        >
          ${mt.canvasHelp.replay}
        </button>
        <button
          type="button"
          class="exit-button primary canvas-done invitation-dismiss"
          @click=${()=>this._closeCanvasHelp()}
        >
          ${as}${mt.canvasHelp.done}
        </button>`):this._isAdmin?this._isDirty||this._saving||this._cancelAnimating||this._saveError?(e="changed",t=W`<curve-footer
        variant="commit"
        .dirty=${this._isDirty||this._cancelAnimating||!!this._saveError}
        .saving=${this._saving||this._membershipLocked}
        .animating=${this._cancelAnimating}
        .saveDisabled=${!this._canGuardedSave}
        @save-curves=${()=>this._onSave()}
        @cancel-curves=${()=>this._onCancel()}
      ></curve-footer>`):this.editMode?(e="clean",t=W`<button
        type="button"
        class="exit-button primary done-button"
        @click=${()=>this.exitEditMode()}
      >
        ${as}${mt.toolbar.done}
      </button>`):this._saveSuccess?(e="saved",t=W`<span class="save-confirmed" role="status"
        >${as}${mt.footer.saved}</span
      >`):(e="view",t=W`<button
        type="button"
        class="exit-button edit-button"
        aria-label=${mt.toolbar.edit}
        title=${mt.toolbar.edit}
        ?disabled=${!this._canEditCurves}
        @click=${()=>this.enterEditMode()}
      >
        ${hs}<span class="exit-label">${mt.toolbar.edit}</span>
      </button>`):e="empty",W`<div class="exit-slot" data-state=${e} tabindex="-1">${t}</div>`}_renderInvitationReplay(){return this.experimentalFirstUse&&this._isAdmin?W`<button
      type="button"
      class="invitation-replay ${this._invitation.curve?"invitation-dismiss":""}"
      aria-label=${this._invitation.curve?mt.invitation.dismiss:mt.invitation.replay}
      title=${this._invitation.curve?mt.invitation.dismiss:mt.invitation.replay}
      ?disabled=${!this._invitation.curve&&!this._canRunInvitation}
      @click=${()=>this._invitation.curve?this._dismissInvitation():this._startInvitation()}
    >
      ${this._invitation.curve?"×":"↻"}
    </button>`:K}_renderToolbar(){const t=this._hostedToolbar;return W`<div class="editor-toolbar" tabindex="-1">
      ${t?W`<div class="header-chips">${this._renderShapeChips()}</div>
            ${this._renderWatchControl()}
            ${this._isAdmin?W`<div class="header-undo" ?data-reserved=${!this._editLayout}>
                  ${this._renderUndo()}
                </div>`:K}`:K}${this._renderInvitationReplay()}${this._renderExitSlot()}${this._renderMoreMenu()}
    </div>`}get _watchHintMode(){return!this._previewActive||this._watchHintDismissed?null:this._narrowLayout?"snackbar":"popover"}_renderWatchControl(){const t=!this._canEditCurves;return W`<span class="watch-anchor" title=${mt.scrubber.watchGuidance}
      >${fi(this._previewActive,(t||this._previewController.blocked)&&!this._previewActive,()=>this._onPreviewToggle())}${"popover"===this._watchHintMode?yi(()=>this._dismissWatchHint()):K}</span
    >`}_renderUndo(){return W`<curve-footer
      variant="undo"
      .saving=${this._saving||this._membershipLocked}
      .canUndo=${this._undoStack.length>0&&this._canUndoCurves}
      @undo-curves=${()=>this._undo()}
    ></curve-footer>`}_renderEditRow(){if(!this._isAdmin)return K;const t=this._renderShapeChips(),e=this._editLayout&&(t!==K||this._undoStack.length>0);return t!==K||e?W`<div class="edit-row" tabindex="-1">
      ${t}${this._renderTrialStatus()}${e?this._renderUndo():K}
    </div>`:K}_renderCommandStatus(){const t=(this._runtimeBlocked?mt.guardedSave.runtime:this._saveError)??("conflict"===this._saveIssue?mt.guardedSave.conflict:"uncertain"===this._saveIssue?mt.guardedSave.uncertain:null),e="readonly"===this._saveIssue?mt.guardedSave.readOnly:"incompatible"===this._saveIssue?mt.guardedSave.incompatible:this._membershipBaseline?mt.guardedSave.checking:"",i=this._previewController;return t||e||i.otherWatching||i.mutationBlocked||i.admissionIssue?W`<div class="command-status">
      ${i.otherWatching?W`<span role="status">${mt.restoration.otherWatching}</span>`:K}
      ${i.mutationBlocked?W`<span role="status">${mt.restoration.operationBlocked}</span>`:K}
      ${i.admissionIssue?W`<span role="status">${i.admissionIssue}</span>`:K}
      ${t?W`<span role="alert"
            >${os}${t}
            <button
              type="button"
              class="command-retry"
              ?disabled=${this._savedRead||this._runtimeBlocked||"refresh"===this._saveIssue||"not_found"===this._saveIssue}
              @click=${()=>this._saveIssue?this._reviewLatest():this._onSave()}
            >
              ${"conflict"===this._saveIssue?mt.guardedSave.review:this._saveIssue?mt.guardedSave.check:mt.footer.retry}
            </button></span
          >`:W`<span role="status" aria-live="polite">${e}</span>`}
    </div>`:K}_renderCanvasGuidance(){return this.canvasHelp&&this._invitation.curve?W`<div class="canvas-guidance">
        <span class="canvas-guidance-text">${this._invitationGuidance}</span>
      </div>`:this.canvasHelp&&this._canvasHelpNotice?W`<div class="canvas-guidance">
        <span class="canvas-guidance-text canvas-notice">${this._canvasHelpNotice}</span>
      </div>`:K}_renderMessageLine(){const t=[this._renderCanvasGuidance(),this._renderMessageInsight(),this._renderCommandStatus(),this._renderNavigationDrafts()].filter(t=>t!==K);return 0===t.length?K:W`<div class="message-line" tabindex="-1">${t}</div>`}render(){const t=this._graphCurves;return W`
      <div
        class="card ${this._embedded?"embedded":""} ${this.experimentalFirstUse?"first-use-experiment":""} ${this._hostedToolbar?"hosted":""} ${this._previewActive?"watching":""}"
        role="region"
        tabindex="-1"
        aria-label="Brightness editor"
      >
        <span class="sr-only invitation-announcement" role="status" aria-atomic="true"
          >${this._invitation.curve?`${this._invitation.curve.friendlyName}. ${this._invitationGuidance}`:this._canvasHelpNotice??""}</span
        >
        ${this._hostedToolbar?K:W`<div class="header">
              <h2>${this._config.title??"Brightness shapes"}</h2>
              ${this._renderToolbar()}
            </div>`}

        <div class="workspace">
          <div class="editor-column">
            <div class="main-stack">
              ${this._load.loading?this._renderLoadingSkeleton():W`<div class="graph-panel">
                    <curve-graph
                      .curves=${t}
                      .selectedCurveId=${this._selectedCurveId}
                      .hoveredCurveId=${this._hoveredCurveId}
                      .entityId=${this._entityId??null}
                      .readOnly=${!this._canEditCurves}
                      .showXAxisLabel=${!0}
                      .scrubberPosition=${this._shownRoomPosition}
                      .watching=${this._previewActive}
                      .previewCurve=${this._presetPreviewCurve}
                      .exampleEntityId=${this._invitation.curve?.entityId??null}
                      .exampleInput=${this._invitationInput}
                      .exampleCue=${this._invitation.frozen?null:this._invitation.cue}
                      .exampleInstruction=${this._invitationCaption}
                      .joy=${this._joy}
                      .curveFrame=${this._curveFrame}
                      .drawIn=${this._drawIn}
                      .drawOut=${this._drawOut}
                      @draw-in-started=${this._onDrawInStarted}
                      @draw-in-waiting=${this._onDrawInWaiting}
                      @pointerdown=${this._onGraphPointerDown}
                      @room-edge-grab=${this._onRoomEdgeGrab}
                      @point-move=${this._onPointMove}
                      @point-drop=${this._onPointDrop}
                      @point-add=${this._onPointAdd}
                      @point-remove=${this._onPointRemove}
                      @graph-interaction=${this._onGraphInteraction}
                      @focus-curve=${this._onFocusCurve}
                      @plot-resize=${this._onPlotResize}
                    ></curve-graph>
                  </div>`}
            </div>
            <div class="control-slot">
              <div class="control-dock" ?data-narrow=${this._narrowLayout}>
                <div class="room-surface">
                  ${this._curves.length>0&&!this._load.loading?W`<curve-scrubber
                        .curves=${t}
                        .alignToAxis=${!0}
                        .contextKey=${`${this._entityId}:${this._narrowLayout}`}
                        .example=${!!this._invitation.curve}
                        .exampleMoving=${"room"===this._invitation.phase&&!this._invitation.frozen}
                        .firstUseHints=${this.experimentalFirstUse}
                        .invitation=${this._invitationTogether}
                        .readOnly=${!this._canEditCurves}
                        .showPreviewToggle=${!1}
                        .canPreview=${this._canEditCurves||this._previewActive}
                        .previewActive=${this._previewActive}
                        .watchingDraft=${this._isDirty}
                        .position=${this._shownRoomPosition}
                        .interactionPosition=${this._effectiveScrubberPosition}
                        @scrubber-move=${this._onScrubberMove}
                        @scrubber-start=${this._onScrubberStart}
                        @scrubber-end=${this._onScrubberEnd}
                        @preview-toggle=${this._onPreviewToggle}
                        ><span slot="watch" class="watch-under-room"
                          >${this._renderWatchControl()}</span
                        ></curve-scrubber
                      >`:K}
                  ${"snackbar"===this._watchHintMode?yi(()=>this._dismissWatchHint(),!0):K}
                </div>
                ${this._renderEditRow()}${this._renderMessageLine()}
              </div>
            </div>
          </div>

          <aside class="side-rail" aria-label=${mt.card.railAria}>
            <curve-legend
              .curves=${t}
              .exampleEntityId=${this._invitation.curve?.entityId??null}
              .selectedCurveId=${this._selectedCurveId}
              .hoveredCurveId=${this._hoveredCurveId}
              .scrubberPosition=${this._shownRoomPosition}
              .readOnly=${!this._canEditCurves||this._load.loading}
              .editingCurves=${this._curves}
              .editingPosition=${this._effectiveScrubberPosition}
              .watching=${this._previewActive}
              .watchAck=${this._watchAck}
              .watchMotion=${this._joy.watch}
              .contextKey=${`${this._entityId}:${this._narrowLayout}:${this._load.loadedEntityId}`}
              @focus-curve=${this._onLightRowFocus}
              @hover-curve=${this._onHoverCurve}
              @light-level-start=${this._onLightLevelStart}
              @light-level-input=${this._onLightLevelInput}
              @light-level-end=${this._onLightLevelEnd}
              .canManage=${this._canManageLights}
              .managing=${this._managingLights}
              .showAllLights=${this._editLayout&&this._isAdmin}
              @clear-selection=${this._clearSelection}
              @select-curve=${this._onSelectCurve}
              @delete-group=${this._onDeleteGroup}
              @delete-group-dismiss=${()=>this._focusMoreButton()}
            ></curve-legend>
            ${this._manageError?W`<div class="error" role="alert">${os} ${this._manageError}</div>`:K}
          </aside>
        </div>

        ${this._saveReview?W`<save-conflict-review
              .review=${this._saveReview}
              @review-dismiss=${()=>this._dismissSaveReview()}
              @review-accept=${this._acceptSaveReview}
            ></save-conflict-review>`:K}
        ${this._membershipOpen&&this._hass&&this._entityId?W`<light-membership-dialog
              .hass=${this._hass}
              .groupEntityId=${this._entityId}
              .beginApply=${t=>this._previewController.beginMutation(t)}
              @membership-close=${this._closeMembershipEditor}
              @membership-applied=${this._onMembershipApplied}
            ></light-membership-dialog>`:K}

        <div class="status-stack">
          ${this._membershipStatus?W`<div class="success" role="status" aria-live="polite">
                ${this._membershipStatus}
              </div>`:K}
          ${this._load.loadError?W`<div class="error" role="alert">
                ${os} Failed to load curves
                <button type="button" class="retry-link" @click=${this._retryLoad}>Retry</button>
              </div>`:K}
          ${this._groupDeleted?W`<div class="error" role="status">
                ${os} This Lightener group was deleted. Remove this card or point it at a
                different group.
              </div>`:K}
        </div>
      </div>
    `}}cs.styles=a`
    ${_i}${bi}
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
  `,t([vt({attribute:!1})],cs.prototype,"experimentalFirstUse",void 0),t([vt({attribute:!1})],cs.prototype,"canvasHelp",void 0),t([vt({attribute:!1})],cs.prototype,"canCreateGroup",void 0),t([gt()],cs.prototype,"_canvasHelpNotice",void 0),t([gt()],cs.prototype,"_invitationEditHint",void 0),t([gt()],cs.prototype,"_invitationTogether",void 0),t([gt()],cs.prototype,"_curves",void 0),t([gt()],cs.prototype,"_originalCurves",void 0),t([gt()],cs.prototype,"_config",void 0),t([gt()],cs.prototype,"_selectedCurveId",void 0),t([gt()],cs.prototype,"_editRequested",void 0),t([gt()],cs.prototype,"_editLayoutHeld",void 0),t([gt()],cs.prototype,"_saveState",void 0),t([vt({attribute:!1})],cs.prototype,"draftSurface",void 0),t([gt()],cs.prototype,"_draftLost",void 0),t([gt()],cs.prototype,"_savedRead",void 0),t([gt()],cs.prototype,"_draftNotice",void 0),t([gt()],cs.prototype,"_resumeUnverified",void 0),t([gt()],cs.prototype,"_baseline",void 0),t([gt()],cs.prototype,"_saveIssue",void 0),t([gt()],cs.prototype,"_saveReview",void 0),t([gt()],cs.prototype,"_load",void 0),t([gt()],cs.prototype,"_manageError",void 0),t([gt()],cs.prototype,"_managingLights",void 0),t([gt()],cs.prototype,"_groupDeleted",void 0),t([gt()],cs.prototype,"_scrubberPosition",void 0),t([gt()],cs.prototype,"_cancelAnimating",void 0),t([gt()],cs.prototype,"_joy",void 0),t([gt()],cs.prototype,"_drawIn",void 0),t([gt()],cs.prototype,"_drawOut",void 0),t([gt()],cs.prototype,"_ripple",void 0),t([gt()],cs.prototype,"_morphLine",void 0),t([gt()],cs.prototype,"_hass",void 0),t([gt()],cs.prototype,"_narrowLayout",void 0),t([vt({attribute:!1})],cs.prototype,"toolbarHost",void 0),t([gt()],cs.prototype,"_previewActive",void 0),t([gt()],cs.prototype,"_watchAck",void 0),t([gt()],cs.prototype,"_watchHintDismissed",void 0),t([gt()],cs.prototype,"_hoveredCurveId",void 0),t([gt()],cs.prototype,"_presetGraphTrial",void 0),t([gt()],cs.prototype,"_membershipOpen",void 0),t([gt()],cs.prototype,"_moreOpen",void 0),t([gt()],cs.prototype,"_membershipStatus",void 0),Ue(He,cs);export{cs as LightenerCurveCard,ds as LightenerCurveCardEditor};
