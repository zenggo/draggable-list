# draggable-list
## 一个 通过鼠标拖拽操作的层级列表 组件
***
依赖：jquery >= 1.7
浏览器支持draggable属性
***
### 基本使用方法
```
// <div id="dgl"></div> id是必须的
var list = [
  {
    name: 'music',
    type: 'dir' // 一个单元至少需要有name属性，另可自定义属性如type，会以.data('type',xx)存储，有子节点用children数组
    children: [ {name:'rock'}, {name:'pop'} ]
  },
  {
    name: 'sport',
    children: [ {name:'soccer'}, {name:'basketball'} ]
  }
];
var option = {maxlevel: 3}; // 最大层级数
var dlist = $('#dgl').draggableList('init', list, option);
// dlist对象 = $('#dgl').data('zdglist')
```
生成dom结构：
```
<div id="dgl" class="zdl-container">
  <ul class="zdl-ul">
    <li class="zdl-unit" draggable="true">
      <div class="zdl-plcr zdl-uppl">up</div> /*置于该单元之上的drop区域*/
	<div class="zdl-plcr zdl-handler"> /*置于该单元之内的drop区域*/
	  <span class="zdl-name">music</span>
        </div>
      <div class="zdl-plcr zdl-downpl">down</div> /*置于该单元之下的drop区域*/
    </li>
   	...
  </ul>
  ...
</div>
```
接下来就可以愉快地拖动改变列表结构了

### option
* `maxlength`：允许的最大层级数
* `hintbox`：drop不被允许情况的提示框 hintbox: $div
* `allows`：['id1','id2'..] 页面上有多个dlist的情况下，指定可以drop的其他dlist的id

### 覆盖样式
$().draggableList('changeClasses', {
  ul_list: 'abc',
  li_unit: 'efg,
  ...
});
可覆盖的样式：(可以把类名都替换掉)
```
_class = { // 默认样式见draggable-list.css
	container: 'zdl-container', // d-list
	ul_list: 'zdl-ul',
	li_unit: 'zdl-unit', // li-unit
	drop_placer: 'zdl-plcr',
	up_placer: 'zdl-uppl',
	up_plc_html: 'up',
	down_placer: 'zdl-downpl',
	down_plc_html: 'down',
	div_handler: 'zdl-handler',
	name_span: 'zdl-name',
	empty_handler: 'zdl-empty'
};
```

### drag->drop过程
顺序：dragstart -> dragenter.dragover.dragleave -> (dropcheck,dropPreDeal) drop -> dragend -> (move element, 因为有动画回调所有跑dragend后面去了) -> emptyDeal, dropendDeal
可以使用 `dlist.addDealer(type, function)`来在拖动过程中添加处理，扩展功能：
*type:*
* `check`：drop前的判断，是否允许drop。如果设定了maxlevel默认检查一次，还可以继续添加别的check方法
* `predeal`：drop前的处理
* `enddeal`：drop后(单元元素已移动到新位置)的处理
function接收的参数详见代码注释。

### 其他dlist对象的方法
* `getDepth`：获取某个单元的深度
* `getLvl`：获取某个单元的层级
* `getJson`：获取本dlist层级结构json格式字符串
* `emptyDealer`：某个单元被移动后，原位置父ul可能为空 -> 移除；原属于的dlist可能为空，添加占位符。接收一个dlist中的ul元素参数
* `appendNew`：新建一个单元

