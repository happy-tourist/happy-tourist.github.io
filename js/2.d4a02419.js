(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[2],{"14f1":function(t,e,i){"use strict";i("8449")},"3f37":function(t,e,i){},"5a21":function(t,e,i){"use strict";i("9b0e")},"6ad9":function(t,e,i){"use strict";i("70d3")},"6f62":function(t,e,i){"use strict";i("3f37")},"70d3":function(t,e,i){},8449:function(t,e,i){},8682:function(t,e,i){"use strict";i("e9c8")},"8b24":function(t,e,i){"use strict";i.r(e);var a=function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("q-page",[i("beam",{attrs:{bottom:t.bottomBeam},on:{finish:t.finishBottomBeam}}),i("beam",{attrs:{top:t.topBeam}}),i("character-selection",{class:{active:t.activeSelection,hide:t.activeGame},on:{start:function(e){t.activeSelectionBtn=!1},finish:t.selectedCharacter}}),i("div",{staticClass:"tir__selected"},[i("tir-button",{attrs:{active:t.activeSelectionBtn,position:"top"}},[t._v("\n      Выберите персонажа\n    ")])],1),i("div",{ref:"level",staticClass:"tir__level",style:{bottom:t.levelBottom}},[i("div",{staticClass:"tir__bg"},[i("img",{attrs:{src:t.level.bg,alt:""}})])])],1)},s=[],c=function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("div",{staticClass:"beam",style:t.styleBeam})},n=[],o={name:"Beam",props:{bottom:{type:String,default:"auto"},top:{type:String,default:"auto"}},computed:{styleBeam(){return{bottom:this.bottom,top:this.top}}},watch:{bottom(){setTimeout((()=>{this.$emit("finish")}),1200)}}},r=o,l=(i("14f1"),i("2877")),u=Object(l["a"])(r,c,n,!1,null,"1cdefe5e",null),h=u.exports,m=function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("div",{staticClass:"tir-button",class:t.classesButton,style:t.styleButton,on:{click:t.onClick}},[i("div",{staticClass:"tir-button__pin"}),i("div",{staticClass:"tir-button__text"},[t._t("default")],2)])},d=[],f={name:"TirButton",props:{width:{type:String,default:"100%"},position:{type:String,default:"left"},active:{type:Boolean,default:!1}},computed:{styleButton(){return{width:this.width}},classesButton(){return{"tir-button--no-active":!this.active,[`tir-button--${this.position}`]:this.position}}},methods:{onClick(){this.$emit("click"),setTimeout((()=>{this.$emit("finish")}),600)}}},p=f,v=(i("6f62"),Object(l["a"])(p,m,d,!1,null,"379e26b3",null)),b=v.exports,B=function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("div",{staticClass:"character-selection"},t._l(t.characters,(function(e,a){return i("character",{key:a,attrs:{src:e},on:{start:function(e){return t.$emit("start")},selected:function(e){return t.$emit("finish")}}})})),1)},_=[],g=function(){var t=this,e=t.$createElement,i=t._self._c||e;return i("div",{staticClass:"character",class:t.isChecked?"character--checked":"",on:{click:t.selected}},[i("img",{attrs:{src:t.src,alt:"character"}}),i("div",{staticClass:"character__pin"})])},C=[],$={name:"Character",data:()=>({isChecked:!1}),props:{src:{type:String,default:""}},methods:{selected(){this.$emit("start"),setTimeout((()=>{this.$emit("selected")}),1200),this.isChecked=!0}}},y=$,S=(i("5a21"),Object(l["a"])(y,g,C,!1,null,"3415b046",null)),k=S.exports,w={name:"CharacterSelection",components:{Character:k},data:()=>({characters:["characters/unicorn.png","characters/prince.png","characters/dragon.png","characters/princess.png"]})},x=w,T=(i("8682"),Object(l["a"])(x,B,_,!1,null,"86a9e198",null)),j=T.exports,E={name:"PageIndex",components:{Beam:h,CharacterSelection:j,TirButton:b},data:()=>({bottomBeam:"0",topBeam:"0",levelBottom:"100%",activeSelection:!1,activeSelectionBtn:!1,activeGame:!1,level:{bg:"levels/bg-level1.png"}}),mounted(){setTimeout((()=>{this.bottomBeam="calc(50% - 8px)"}),1200)},methods:{finishBottomBeam(){this.activeGame||(this.activeSelection=!0,setTimeout((()=>{this.activeSelectionBtn=!0}),1200))},selectedCharacter(){this.topBeam=`${this.$refs.level.clientHeight}px`,this.levelBottom=`calc(100% - ${this.$refs.level.clientHeight}px)`,this.bottomBeam="0",this.activeGame=!0}}},O=E,G=(i("6ad9"),i("9989")),H=i("eebe"),J=i.n(H),P=Object(l["a"])(O,a,s,!1,null,"131bef8d",null);e["default"]=P.exports;J()(P,"components",{QPage:G["a"]})},"9b0e":function(t,e,i){},e9c8:function(t,e,i){}}]);