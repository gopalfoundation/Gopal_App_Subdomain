declare class HTMLRewriter {
  on(selector:string,handler:{element(element:{setAttribute(name:string,value:string):void;setInnerContent(value:string,options?:{html:boolean}):void;append(value:string,options?:{html:boolean}):void;remove():void}):void}):this;
  transform(response:Response):Response;
}
