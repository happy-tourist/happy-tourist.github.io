(self["webpackChunkht"]=self["webpackChunkht"]||[]).push([[779],{6779:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>M});var a=s(3673);function n(e,t,s,n,i,h){const l=(0,a.up)("level-map"),o=(0,a.up)("user-panel");return(0,a.wg)(),(0,a.iD)("div",null,[(0,a.Wm)(l),(0,a.Wm)(o)])}function i(e,t,s,n,i,h){const l=(0,a.up)("v-image"),o=(0,a.up)("v-layer"),r=(0,a.up)("v-stage");return(0,a.wg)(),(0,a.j4)(r,{ref:"map",class:"ht-map",config:{x:e.widthCanvas/2-e.widthLevel/2,y:e.heightCanvas/2-e.heightLevel/2,width:e.widthCanvas,height:e.heightCanvas,draggable:!0,dragBoundFunc:e=>h.setPosition(e)},onWheel:h.wheel,onTouchmove:h.touchmove,onTouchend:h.touchend},{default:(0,a.w5)((()=>[(0,a.Wm)(o,null,{default:(0,a.w5)((()=>[(0,a.Wm)(l,{config:{width:e.widthLevel,height:e.heightLevel,image:e.bgLevel}},null,8,["config"])])),_:1})])),_:1},8,["config","onWheel","onTouchmove","onTouchend"])}var h=s(515),l=s.n(h),o=s(7013),r=s(7874);const c={name:"LevelMap",mounted(){this.widthCanvas=window.innerWidth,this.heightCanvas=window.innerHeight;const e=new window.Image;e.src=`/statics/levels/bg-level-${this.profile.curLevel}.png`,this.$q.loading.show({spinner:o.Z,spinnerColor:"primary",spinnerSize:140}),e.onload=()=>{this.bgLevel=e,this.$q.loading.hide()}},data:()=>({scaleBy:1.1,widthCanvas:1600,heightCanvas:900,widthLevel:3536,heightLevel:2704,bgLevel:null,scaleMap:1,lastCenter:null,lastDist:0}),computed:l()(l()({},(0,r.Se)("profile",["profile"])),{},{minScale(){return this.widthCanvas>this.heightCanvas?this.widthCanvas/this.widthLevel:this.heightCanvas/this.heightLevel}}),methods:{setPosition({x:e,y:t}){return{x:Math.min(Math.max(e,this.widthCanvas-this.scaleMap*this.widthLevel),0),y:Math.min(Math.max(t,this.heightCanvas-this.scaleMap*this.heightLevel),0)}},wheel(e){if(!e.evt)return;e.evt.preventDefault();const t=this.$refs.map.getNode(),s=t.scaleX(),a=t.getPointerPosition(),n={x:(a.x-t.x())/s,y:(a.y-t.y())/s},i=e.evt.deltaY<0?Math.min(s*this.scaleBy,2):Math.max(s/this.scaleBy,this.minScale);t.scale({x:i,y:i}),this.scaleMap=i;const h=this.setPosition({x:a.x-n.x*i,y:a.y-n.y*i});t.position(h),t.batchDraw()},getCenter(e,t){return{x:(e.x+t.x)/2,y:(e.y+t.y)/2}},getDistance(e,t){return Math.sqrt((t.x-e.x)**2+(t.y-e.y)**2)},touchmove(e){if(!e.evt)return;e.evt.preventDefault();const t=e.evt.touches[0],s=e.evt.touches[1],a=this.$refs.map.getNode();if(t&&s){a.draggable()&&a.draggable(!1);const e={x:t.clientX,y:t.clientY},n={x:s.clientX,y:s.clientY};if(!this.lastCenter)return void(this.lastCenter=this.getCenter(e,n));const i=this.getCenter(e,n),h=this.getDistance(e,n);this.lastDist||(this.lastDist=h);const l={x:(i.x-a.x())/a.scaleX(),y:(i.y-a.y())/a.scaleX()},o=Math.min(Math.max(a.scaleX()*(h/this.lastDist),this.minScale),2);this.scaleMap=o,a.scale({x:o,y:o});const r=i.x-this.lastCenter.x,c=i.y-this.lastCenter.y,v=this.setPosition({x:i.x-l.x*o+r,y:i.y-l.y*o+c});a.position(v),a.batchDraw(),this.lastDist=h,this.lastCenter=i}},touchend(){const e=this.$refs.map.getNode();e.draggable(!0),this.lastDist=0,this.lastCenter=null}}};c.render=i,c.__scopeId="data-v-f20b3846";const v=c;var d=s(4310),u=s.n(d);(0,a.dD)("data-v-1497ee06");const g={class:"ht-user-panel"},p=(0,a._)("img",{src:u()},null,-1);function m(e,t,s,n,i,h){const l=(0,a.up)("q-avatar"),o=(0,a.up)("q-btn");return(0,a.wg)(),(0,a.iD)("div",g,[(0,a.Wm)(o,{round:"",class:"ht-user-panel__btn"},{default:(0,a.w5)((()=>[(0,a.Wm)(l,{class:"ht-user-panel__avatar"},{default:(0,a.w5)((()=>[p])),_:1})])),_:1})])}(0,a.Cn)();const w={name:"UserPanel"};var x=s(4607),y=s(5096),f=s(7518),C=s.n(f);w.render=m,w.__scopeId="data-v-1497ee06";const b=w;C()(w,"components",{QBtn:x.Z,QAvatar:y.Z});const L={components:{UserPanel:b,LevelMap:v}};L.render=n;const M=L},4310:(e,t,s)=>{e.exports=s.p+"img/user.8cab937a.png"}}]);