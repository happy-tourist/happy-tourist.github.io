(self["webpackChunkht"]=self["webpackChunkht"]||[]).push([[483],{1483:(M,e,N)=>{"use strict";N.r(e),N.d(e,{default:()=>P});var t=N(3673),s=N(2323);function u(M,e,N,u,j,T){const g=(0,t.up)("question"),D=(0,t.up)("router-view"),z=(0,t.up)("q-page-container"),a=(0,t.up)("dialog-top"),I=(0,t.up)("q-layout");return(0,t.wg)(),(0,t.j4)(I,null,{default:(0,t.w5)((()=>[M.hideQuestion?(0,t.kq)("",!0):((0,t.wg)(),(0,t.j4)(g,{key:0,"cur-route":M.curRoute},null,8,["cur-route"])),(0,t.Wm)(z,null,{default:(0,t.w5)((()=>[(0,t.Wm)(D,{class:(0,s.C_)(["ht-main",M.hideQuestion?"":"ht-main--question"])},null,8,["class"])])),_:1}),(0,t.Wm)(a)])),_:1})}var j=N(515),T=N.n(j),g=N(7874),D=N(1959),z=N(6395),a=N(8825);const I={class:"ht-dialog-top__wrap"},i={class:"ht-dialog-top__text"},c=(0,t.Uk)(" Ok "),L=["src"],o=["src"];function n(M,e,N,u,j,T){const g=(0,t.up)("q-card-section"),D=(0,t.up)("q-card"),z=(0,t.up)("q-btn"),a=(0,t.up)("q-avatar"),n=(0,t.up)("q-dialog"),y=(0,t.Q2)("close-popup");return M.innerMessage?((0,t.wg)(),(0,t.j4)(n,{key:0,modelValue:M.openDialog,"onUpdate:modelValue":e[0]||(e[0]=e=>M.openDialog=e),seamless:"",position:"top",class:"ht-dialog-top",onHide:M.hideDialog},{default:(0,t.w5)((()=>[(0,t._)("div",I,[(0,t.Wm)(D,{class:"ht-dialog-top__card"},{default:(0,t.w5)((()=>[(0,t.Wm)(g,null,{default:(0,t.w5)((()=>[(0,t._)("div",i,(0,s.zw)(M.innerMessage.text),1)])),_:1})])),_:1}),(0,t.wy)((0,t.Wm)(z,{round:"",color:"primary",class:"ht-dialog-top__hide"},{default:(0,t.w5)((()=>[c])),_:1},512),[[y]]),(0,t.Wm)(a,{size:"62px",class:"ht-dialog-top__avatar"},{default:(0,t.w5)((()=>[(0,t._)("img",{src:`/statics/senders/${M.innerMessage.avatar}`},null,8,L)])),_:1}),M.innerMessage.gesture?((0,t.wg)(),(0,t.iD)("div",{key:0,class:"ht-dialog-top__gesture",style:(0,s.j5)(M.gestureStyle)},[(0,t._)("img",{src:`/statics/gestures/${M.innerMessage.gesture}.png`},null,8,o)],4)):(0,t.kq)("",!0)])])),_:1},8,["modelValue","onHide"])):(0,t.kq)("",!0)}N(71);var y=N(9150);const r=(0,t.aZ)({name:"DialogTop",setup(){return{openDialog:(0,D.iH)(!1),loaded:(0,D.iH)(!1)}},created(){const M=z.Z.getItem("showedMessages");this.setShowedMessages(M?[...new Set(M)]:[]);const e=z.Z.getItem("curMessages");this.setCurMessages(e||{})},computed:T()(T()({},(0,g.Se)("dialog-top",["message","reMessage","showedMessages","curMessages","showedInnerMessages"])),{},{innerMessage(){return y.Z[this.message]},messageAlreadyHas(){return Object.values(this.showedInnerMessages).includes(this.message)&&!this.reMessage},gestureStyle(){return{"--gesture-top-start":this.innerMessage.gesture_top_start,"--gesture-top-end":this.innerMessage.gesture_top_end,"--gesture-left-start":this.innerMessage.gesture_left_start,"--gesture-left-end":this.innerMessage.gesture_left_end}}}),methods:T()(T()({},(0,g.nv)("dialog-top",["setMessage","setReMessage","addShowedMessage","setShowedMessages","setCurMessages","setCurMessage"])),{},{hideDialog(){this.innerMessage&&(this.innerMessage.storage&&!this.messageAlreadyHas&&this.addShowedMessage(this.message),this.reMessage&&this.innerMessage.last?(this.setReMessage(""),this.setMessage(""),this.setCurMessage({route:this.$route.name,message:""})):(this.setCurMessage({route:this.$route.name,message:this.innerMessage.next}),this.setMessage(this.innerMessage.next)))}}),watch:{message(M){this.openDialog=!!M&&!this.messageAlreadyHas},reMessage(M){this.setMessage(M)}}});var O=N(2819),A=N(151),x=N(5589),l=N(4607),E=N(5096),w=N(677),d=N(7518),Q=N.n(d);r.render=n;const U=r;Q()(r,"components",{QDialog:O.Z,QCard:A.Z,QCardSection:x.Z,QBtn:l.Z,QAvatar:E.Z}),Q()(r,"directives",{ClosePopup:w.Z});var k=N(8475),C=N.n(k);(0,t.dD)("data-v-f1cf753a");const p={class:"ht-question"},h=(0,t._)("img",{src:C()},null,-1),Y=(0,t._)("div",{class:"text-subtitle1"},"Какие подсказки повторить?",-1);function S(M,e,N,u,j,T){const g=(0,t.up)("q-avatar"),D=(0,t.up)("q-btn"),z=(0,t.up)("q-card-section"),a=(0,t.up)("q-item-section"),I=(0,t.up)("q-item"),i=(0,t.up)("q-list"),c=(0,t.up)("q-card"),L=(0,t.up)("q-dialog"),o=(0,t.Q2)("ripple");return(0,t.wg)(),(0,t.iD)("div",p,[(0,t.Wm)(D,{round:"",color:"secondary",onClick:e[0]||(e[0]=e=>M.openList=!0)},{default:(0,t.w5)((()=>[(0,t.Wm)(g,{size:"62px"},{default:(0,t.w5)((()=>[h])),_:1})])),_:1}),M.reShowMessages.length?((0,t.wg)(),(0,t.j4)(L,{key:0,modelValue:M.openList,"onUpdate:modelValue":e[1]||(e[1]=e=>M.openList=e),position:"top"},{default:(0,t.w5)((()=>[(0,t.Wm)(c,null,{default:(0,t.w5)((()=>[(0,t.Wm)(z,null,{default:(0,t.w5)((()=>[Y])),_:1}),(0,t.Wm)(i,{dark:"",bordered:"",separator:"",style:{"max-width":"318px"}},{default:(0,t.w5)((()=>[((0,t.wg)(!0),(0,t.iD)(t.HY,null,(0,t.Ko)(M.reShowMessages,((e,N)=>(0,t.wy)(((0,t.wg)(),(0,t.j4)(I,{key:N,clickable:"",onClick:N=>M.onClick(e.message)},{default:(0,t.w5)((()=>[(0,t.Wm)(a,null,{default:(0,t.w5)((()=>[(0,t.Uk)((0,s.zw)(e.caption),1)])),_:2},1024)])),_:2},1032,["onClick"])),[[o]]))),128))])),_:1})])),_:1})])),_:1},8,["modelValue"])):(0,t.kq)("",!0)])}(0,t.Cn)();const m=(0,t.aZ)({name:"Question",props:{curRoute:{type:String,default:""}},setup(){return{openList:(0,D.iH)(!1)}},computed:{reShowMessages(){return this.$store.getters["dialog-top/reShowMessages"](this.curRoute)}},methods:T()(T()({},(0,g.nv)("dialog-top",["setMessage","setReMessage"])),{},{onClick(M){this.openList=!1,this.setMessage(""),this.setReMessage(M)}})});var _=N(7011),v=N(3414),f=N(2035),Z=N(6489);m.render=S,m.__scopeId="data-v-f1cf753a";const q=m;Q()(m,"components",{QBtn:l.Z,QAvatar:E.Z,QDialog:O.Z,QCard:A.Z,QCardSection:x.Z,QList:_.Z,QItem:v.Z,QItemSection:f.Z}),Q()(m,"directives",{Ripple:Z.Z});var W=N(3507);const R=(0,t.aZ)({name:"MainLayout",components:{DialogTop:U,Question:q},setup(){const M=(0,a.Z)();return M.dark.set(!0),{curRoute:(0,D.iH)(""),excludeQuestionRoutes:[W.Z.INDEX_INDEX]}},created(){const M=z.Z.getItem("profile");M&&this.setProfile(M)},mounted(){this.setMessage(this.$route.name),this.curRoute=this.$route.name},computed:{hideQuestion(){return this.excludeQuestionRoutes.includes(this.curRoute)}},methods:T()(T()({},(0,g.nv)("dialog-top",["setMessage"])),(0,g.nv)("profile",["setProfile"])),watch:{$route(){this.setMessage(this.$route.name),this.curRoute=this.$route.name}}});var b=N(4899),H=N(2652);R.render=u,R.__scopeId="data-v-3cbe53cb";const P=R;Q()(R,"components",{QLayout:b.Z,QPageContainer:H.Z})},8475:M=>{M.exports="data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjUxMnB0IiB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgd2lkdGg9IjUxMnB0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Im00MzcuMDE5NTMxIDc0Ljk4MDQ2OWMtNDguMzUxNTYyLTQ4LjM1MTU2My0xMTIuNjQwNjI1LTc0Ljk4MDQ2OS0xODEuMDE5NTMxLTc0Ljk4MDQ2OS02MS41NTQ2ODggMC0xMjEuMDM5MDYyIDIyLjE2MDE1Ni0xNjcuNSA2Mi40MDIzNDQtMy4xNzU3ODEgMi43NS0zLjUxOTUzMSA3LjU1NDY4Ny0uNzY5NTMxIDEwLjcyNjU2MiAyLjc1IDMuMTc1NzgyIDcuNTUwNzgxIDMuNTE5NTMyIDEwLjcyNjU2Mi43Njk1MzIgNDMuNjk1MzEzLTM3Ljg0NzY1NyA5OS42NDQ1MzEtNTguNjkxNDA3IDE1Ny41NDI5NjktNTguNjkxNDA3IDY0LjMxNjQwNiAwIDEyNC43ODUxNTYgMjUuMDQ2ODc1IDE3MC4yNjU2MjUgNzAuNTI3MzQ0czcwLjUyNzM0NCAxMDUuOTQ5MjE5IDcwLjUyNzM0NCAxNzAuMjY1NjI1LTI1LjA0Njg3NSAxMjQuNzg1MTU2LTcwLjUyNzM0NCAxNzAuMjY1NjI1LTEwNS45NDkyMTkgNzAuNTI3MzQ0LTE3MC4yNjU2MjUgNzAuNTI3MzQ0LTEyNC43ODUxNTYtMjUuMDQ2ODc1LTE3MC4yNjU2MjUtNzAuNTI3MzQ0LTcwLjUyNzM0NC0xMDUuOTQ5MjE5LTcwLjUyNzM0NC0xNzAuMjY1NjI1YzAtNTkuODI0MjE5IDIyLjA4MjAzMS0xMTcuMTc1NzgxIDYyLjE4MzU5NC0xNjEuNDg0Mzc1IDIuODE2NDA2LTMuMTEzMjgxIDIuNTc0MjE5LTcuOTIxODc1LS41MzkwNjMtMTAuNzQyMTg3LTMuMTEzMjgxLTIuODE2NDA3LTcuOTIxODc0LTIuNTc4MTI2LTEwLjczODI4MS41MzkwNjItNDIuNjMyODEyIDQ3LjEwOTM3NS02Ni4xMTMyODEgMTA4LjA4MjAzMS02Ni4xMTMyODEgMTcxLjY4NzUgMCA2OC4zNzg5MDYgMjYuNjI4OTA2IDEzMi42Njc5NjkgNzQuOTgwNDY5IDE4MS4wMTk1MzEgNDguMzUxNTYyIDQ4LjM1MTU2MyAxMTIuNjQwNjI1IDc0Ljk4MDQ2OSAxODEuMDE5NTMxIDc0Ljk4MDQ2OXMxMzIuNjY3OTY5LTI2LjYyODkwNiAxODEuMDE5NTMxLTc0Ljk4MDQ2OWM0OC4zNTE1NjMtNDguMzUxNTYyIDc0Ljk4MDQ2OS0xMTIuNjQwNjI1IDc0Ljk4MDQ2OS0xODEuMDE5NTMxcy0yNi42Mjg5MDYtMTMyLjY2Nzk2OS03NC45ODA0NjktMTgxLjAxOTUzMXptMCAwIi8+PHBhdGggZD0ibTI0Ni4zMzIwMzEgMzQ3LjEyNWMtMjMuNDgwNDY5IDAtNDIuNTg1OTM3IDE5LjMxMjUtNDIuNTg1OTM3IDQzLjA0Njg3NXMxOS4xMDU0NjggNDMuMDQ2ODc1IDQyLjU4NTkzNyA0My4wNDY4NzVjMTEuNTI3MzQ0IDAgMjIuMzgyODEzLTQuNTg1OTM4IDMwLjU2NjQwNy0xMi45MTc5NjkgNy45Mjk2ODctOC4wNzQyMTkgMTIuNDgwNDY4LTE5LjA1NDY4NyAxMi40ODA0NjgtMzAuMTI4OTA2IDAtMTEuMzc4OTA2LTQuNTExNzE4LTIyLjE1NjI1LTEyLjY5OTIxOC0zMC4zNDc2NTYtOC4xOTE0MDctOC4xODc1LTE4Ljk2ODc1LTEyLjY5OTIxOS0zMC4zNDc2NTctMTIuNjk5MjE5em0wIDcwLjg4NjcxOWMtMTUuMDk3NjU2IDAtMjcuMzc4OTA2LTEyLjQ4ODI4MS0yNy4zNzg5MDYtMjcuODM5ODQ0czEyLjI4MTI1LTI3LjgzOTg0NCAyNy4zNzg5MDYtMjcuODM5ODQ0YzE1LjA4OTg0NCAwIDI3LjgzNTkzOCAxMi43NSAyNy44MzU5MzggMjcuODM5ODQ0cy0xMi43NDYwOTQgMjcuODM5ODQ0LTI3LjgzNTkzOCAyNy44Mzk4NDR6bTAgMCIvPjxwYXRoIGQ9Im0zMTkuNjA1NDY5IDIyOC4zNzEwOTRjMy4xNjc5NjkgMi43NjU2MjUgNy45Njg3NSAyLjQzNzUgMTAuNzMwNDY5LS43MjY1NjMgMTguMzI0MjE4LTIwLjk5MjE4NyAyNy42MTcxODctNDIuOTY4NzUgMjcuNjE3MTg3LTY1LjMxNjQwNiAwLTIzLjU2NjQwNi0xMC41ODU5MzctNDQuOTI5Njg3LTI5LjgwNDY4Ny02MC4xNTIzNDQtMTkuMzIwMzEzLTE1LjMwMDc4MS00NS41MzkwNjMtMjMuMzg2NzE5LTc1LjgyODEyNi0yMy4zODY3MTktMzcuNDY4NzUgMC02MC42NDQ1MzEgMTIuNjQ4NDM4LTczLjQ4NDM3NCAyMy4yNTc4MTMtMTUuNTI3MzQ0IDEyLjgyODEyNS0yNC44MDA3ODIgMzAuMDMxMjUtMjQuODAwNzgyIDQ2LjAxNTYyNSAwIDEwLjM5MDYyNSA0LjI1MzkwNiAxOS41NDI5NjkgMTEuOTgwNDY5IDI1Ljc3MzQzOCA2LjM1OTM3NSA1LjEyODkwNiAxNC44MjgxMjUgOC4wNzAzMTIgMjMuMjQyMTg3IDguMDcwMzEyIDE0LjQ5NjA5NCAwIDIwLjg1MTU2My05LjM3MTA5NCAyNS45NTcwMzItMTYuOTAyMzQ0IDYuNDY4NzUtOS41MzUxNTYgMTIuNTc0MjE4LTE4LjU0Mjk2OCAzNS43MTg3NS0xOC41NDI5NjggNy45MzM1OTQgMCAzMy44MjAzMTIgMS43MTA5MzcgMzMuODIwMzEyIDIzLjY5NTMxMiAwIDE2LjU5Mzc1LTE1LjMzOTg0NCAyOC4zNzEwOTQtMjguODc1IDM4Ljc2MTcxOS0zLjM0Mzc1IDIuNTYyNS02LjUgNC45ODgyODEtOS40NDUzMTIgNy40ODgyODEtMTUuNTg1OTM4IDEzLjQzMzU5NC0zMy40ODA0NjkgMzQuMTgzNTk0LTMzLjQ4MDQ2OSA3NS43MjY1NjIgMCAyMy4wNzQyMTkgNS41OTc2NTYgMzguNDQ1MzEzIDMyLjkyMTg3NSAzOC40NDUzMTMgMTIuMTAxNTYyIDAgMjEuMjM4MjgxLTIuNzQyMTg3IDI3LjE1NjI1LTguMTQ4NDM3IDQuOTY4NzUtNC41MzkwNjMgNy41OTc2NTYtMTAuODc4OTA3IDcuNTk3NjU2LTE4LjMzNTkzOCAwLTIyLjQxNDA2MiAwLTMzLjY2NDA2MiAyMi44NTkzNzUtNTEuNTQyOTY5bC4zOTA2MjUtLjMwNDY4N2MxLjAwNzgxMy0uNzg1MTU2IDIuMTcxODc1LTEuNjk1MzEzIDMuNDUzMTI1LTIuNzMwNDY5IDMuMjY5NTMxLTIuNjM2NzE5IDMuNzgxMjUtNy40MjE4NzUgMS4xNDQ1MzEtMTAuNjkxNDA2LTIuNjM2NzE4LTMuMjY5NTMxLTcuNDIxODc0LTMuNzgxMjUtMTAuNjkxNDA2LTEuMTQ0NTMxLTEuMjE0ODQ0Ljk4MDQ2OC0yLjMxMjUgMS44MzU5MzctMy4yNjE3MTggMi41NzgxMjRsLS40MDIzNDQuMzEyNWMtMjcuMzY3MTg4IDIxLjQwNjI1LTI4LjY5OTIxOSAzNy4yOTI5NjktMjguNjk5MjE5IDYzLjUyNzM0NCAwIDMuMzcxMDk0IDAgMTEuMjczNDM4LTE5LjU0Njg3NSAxMS4yNzM0MzgtOS41NDY4NzUgMC0xMi40NTMxMjUtMS45OTYwOTQtMTMuOTE3OTY5LTMuNzM4MjgyLTIuNTU0Njg3LTMuMDM1MTU2LTMuNzk2ODc1LTkuNDE0MDYyLTMuNzk2ODc1LTE5LjUgMC0zNS4xNjAxNTYgMTQuMjU3ODEzLTUyLjE4NzUgMjguMTU2MjUtNjQuMTY3OTY4IDIuNjIxMDk0LTIuMjIyNjU2IDUuNjMyODEzLTQuNTM1MTU2IDguODI0MjE5LTYuOTg0Mzc1IDE1LjUxMTcxOS0xMS45MTAxNTcgMzQuODI0MjE5LTI2LjczNDM3NSAzNC44MjQyMTktNTAuODI0MjE5IDAtMjMuNjMyODEyLTE5LjI0NjA5NC0zOC45MDIzNDQtNDkuMDMxMjUtMzguOTAyMzQ0LTMxLjIwMzEyNSAwLTQxLjA4NTkzOCAxNC41NzQyMTktNDguMzA0Njg4IDI1LjIxNDg0NC00LjkzMzU5NCA3LjI3NzM0NC03LjE4MzU5NCAxMC4yMzA0NjktMTMuMzcxMDk0IDEwLjIzMDQ2OS04LjA0Mjk2OCAwLTIwLjAxMTcxOC00Ljk2NDg0NC0yMC4wMTE3MTgtMTguNjM2NzE5IDAtOC44Nzg5MDYgNS4wNjI1LTIyLjU1MDc4MSAxOS4yNzczNDQtMzQuMjkyOTY5IDEwLjkyMTg3NC05LjAxOTUzMSAzMC44NTE1NjItMTkuNzc3MzQzIDYzLjgwMDc4MS0xOS43NzczNDMgNTMuMjQyMTg3IDAgOTAuNDIxODc1IDI4LjEwMTU2MiA5MC40MjE4NzUgNjguMzM1OTM3IDAgMTguNTYyNS04LjAyNzM0NCAzNy4xNzE4NzUtMjMuODYzMjgyIDU1LjMxNjQwNi0yLjc2NTYyNCAzLjE2NDA2My0yLjQzNzUgNy45NjQ4NDQuNzIyNjU3IDEwLjcyNjU2M3ptMCAwIi8+PC9zdmc+"}}]);