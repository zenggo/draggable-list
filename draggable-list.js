/*!
 * draggable-list jQuery Plugin - Copyright (c) 2016 zenggo
 * https://github.com/zenggo/draggable-list
 */
;(function ($, window, document, undefined) {

	var _class = { // 默认样式
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

	function ZDgList ($el, option) {
		this.$el = $el;
		this.status = {
			elid: $el.attr('id'),
			draging: false,
			dragel: null, // 正在被拖动的li-unit
			dragelPar: null // 被拖动li-unit的父ul元素
		};
		this.relation = option.allows; // 允许拖动到自身之外的d-list块
		this.maxlevel = option.maxlevel || null; // 允许的最大层级数
		this.$hinter = option.hinter || null; // 拖动错误提示
		this.dropchecker = []; // 是否允许drop检查，可自定义规则
		this.dropPreDealers = []; // 通过drop检查，li-unit移动前可自定义处理
		this.dropEndDealers = []; // 拖动结束、li-unit移动后可自定义处理
		// 顺序：dragstart -> dragenter.dragover.dragleave -> (dropcheck,dropPreDeal) drop -> dragend
		// -> (move element, 因为有动画回调所有跑dragend后面去了) -> emptyDeal, dropendDeal
	}
	ZDgList.prototype.getDepth = getDepth; // 获取某个li-unit的深度
	ZDgList.prototype.getLvl = getLvl; // 获取某个li-unit的层级
	ZDgList.prototype.getJson = getJson; // 获取本d-list层级结构json串
	ZDgList.prototype.emptyDealer = emptyDealer; // li-unit被移动后，原位置父ul可能为空->移除；原属于的d-list可能为空，添加占位符
	ZDgList.prototype.appendNew = appendNew; // 本d-list新建li-unit

	ZDgList.prototype.addDealer = function (type, fn) {
		switch (type) {
			case 'check':
				this.dropchecker.push(fn); break;
			case 'predeal':
				this.dropPreDealers.push(fn); break;
			case 'enddeal':
				this.dropEndDealers.push(fn); break;
			default: break;
		}
	} 
	ZDgList.prototype.clearDealers = function (type) {
		switch (type) {
			case 'check':
				this.dropchecker = []; break;
			case 'predeal':
				this.dropPreDealers = []; break;
			case 'enddeal':
				this.dropEndDealers = []; break;
			default: break;
		}	
	}

	var init = function (list, option) {
		var $list = $('<ul class="'+_class.ul_list+'"></ul>');
		if (list.length) {
			$(list).each(function (i, v) {
				$list.append(genHTML(v));
			});	
		} else {
			$list.append('<li><div class="'+ _class.empty_handler +'">drop here</div></li>');
		}
		this.addClass(_class.container).append($list); // this -> $containerEl
		var zdgdata = new ZDgList(this, option);
		if (option.maxlevel) {
			zdgdata.dropchecker.push(check_maxlvl); // drop最大层数检查
		}
		this.data('zdglist', zdgdata);
		bind(zdgdata);
		return zdgdata;
	};

	// on drag
	function bind (zdglist) {
		var $el = zdglist.$el;
		var st = zdglist.status;
		$el.on('dragstart', '.'+_class.li_unit, function (ev) {
			dragstart_handler(this, st);
		}).on('dragend', '.'+_class.li_unit, function (ev) {
			dragend_handler();
		}).on('dragover', '.'+_class.drop_placer, function (ev) {
			dragmoveon_handler(this, $el, 'over', ev);
		}).on('dragleave', '.'+_class.drop_placer, function (ev) {
			dragmoveon_handler(this, $el, 'leave', ev);
		}).on('drop', '.'+_class.drop_placer, function (ev) {
			drop_handler(this, st, $el, ev);
		});
		bindEmptyPlacer(zdglist);
	}
	function bindEmptyPlacer (zdglist) {
		var $el = zdglist.$el;
		var st = zdglist.status;
		$el.on('dragover', '.'+_class.empty_handler, function (ev) {
			if (st.draging || zdglist.relation.indexOf(_dragFromEl)>=0) {
				ev.preventDefault();
			}
		}).on('drop', '.'+_class.empty_handler, function (ev) {
			var $from = $('#'+_dragFromEl);
			var st = $from.data('zdglist').status;
			var dragel = st.dragel;
			var args = [$(dragel), $el, $from, $el, $(st.dragelPar), $(this), 'fillEmpty'];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			var $that = $(this).parent().parent();
			$(this).parent().remove();
			dropPreDeal.apply(null, args);
			$(dragel).hide(150, function () {
				$that.append(dragel);
				emptyDealer(args[4]);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			});
		});
	}

	var _dragFromEl; // 全局 同时刻只有一个li-unit被拖动 保存li-unit开始拖时所属的d-list的id
	function dragstart_handler (unit, st) {
		if (_dragFromEl) {return;}
		st.draging = true;
		st.dragel = unit;
		st.dragelPar = unit.parentNode;
		_dragFromEl = st.elid;
	}
	function dragend_handler () {
		if (!_dragFromEl) {return;}
		var st = $('#'+_dragFromEl).data('zdglist').status;
		st.draging = false;
		st.dragel = null;
		st.dragelPar = null;
		_dragFromEl = null;
	}
	function dragmoveon_handler (target, $el, type, ev) {
		var $tgt = $(target);
		var dt = $el.data('zdglist');
		var st = dt.status;
		if (!st.draging && dt.relation.indexOf(_dragFromEl)<0) { // 也不是从其他允许的list里拖过来的
			return;
		}
		if (st.draging && st.dragel === $tgt.parent()[0]) {
			return; // 自己拖到自己
		}
		if (st.draging && $(st.dragel).find($tgt).length) {
			return; // 拖到自己内部元素
		}
		switch (type) {
			case 'over':
				ev.preventDefault();	
				$tgt.css({opacity: 1});		
				break;	
			case 'leave':
				$tgt.css({opacity: ''});
				break;
			default: break;
		}
	}
	function drop_handler (target, st, $el, ev) {
		ev.preventDefault();
		var $droparea = $(target);
		$droparea.css({opacity: ''});
		var $dropUnit = $droparea.parent();
		var dragel, $from, $dragelPar;
		if (st.draging) {
			dragel = st.dragel;
			$from = $el;
			$dragElPar = $(st.dragelPar);
		} else { // 从别的list拖过来的
			$from = $('#'+_dragFromEl);
			var fst = $from.data('zdglist').status; 
			dragel = fst.dragel;
			$dragElPar = $(fst.dragelPar);
		}
		var args;
		if ($droparea.hasClass(_class.div_handler)) { // 置于目标li-unit之内
			args = [$(dragel), $dropUnit, $from, $el, $dragElPar, $dropUnit, 'in'];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			var $ul = $dropUnit.children('.'+_class.ul_list).eq(0);
			if (!$ul.length) {
				$ul = $('<ul class="' + _class.ul_list + '"></ul>');
				$dropUnit.append($ul);
			}
			$(dragel).hide(150, function () {
				$ul.append(dragel);
				emptyDealer($dragElPar);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			});
		} else if ($droparea.hasClass(_class.up_placer)) { // 置于目标li-unit之上
			args = [$(dragel), $dropUnit.parent().parent(), $from, $el, $dragElPar, $dropUnit, 'up'];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			$(dragel).hide(150, function () {
				$(dragel).insertBefore($dropUnit);
				emptyDealer($dragElPar);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			})
		} else { // 置于目标li-unit之下
			args = [$(dragel), $dropUnit.parent().parent(), $from, $el, $dragElPar, $dropUnit, 'down'];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			$(dragel).hide(150, function () {
				$(dragel).insertAfter($dropUnit);
				emptyDealer($dragElPar);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			});
		}
	}

	// drop check
	function dropCheck ($dragel, $dropInUnit, $fromel, $toel, $dragElPar, $dropUnit, type) { 
	// 拖动li-unit，目的地所属li-unit，源d-list，目的d-list, 拖动元素原来的父ul, 目的地li-unit，插入类型
		var dt = $toel.data('zdglist');
		var checkers = dt.dropchecker;
		dt.$hinter && dt.$hinter.html('');
		for (var i=0; i<checkers.length; i++) {
			if (!checkers[i].apply(null, arguments)) {
				return false;
			}
		}
		return true;
	}
	function check_maxlvl ($dragel, $dropInUnit, $fromel, $toel) {
		var dt = $toel.data('zdglist');
		var dep = getDepth($dragel),
			lvl = getLvl($dropInUnit);
		if (dep + lvl > dt.maxlevel) {
			dt.$hinter && dt.$hinter.append('<p>最大层级为' + dt.maxlevel + '</p>')
			return false;
		}
		return true;
	}

	// before dropped
	function dropPreDeal ($dragel, $dropInUnit, $fromel, $toel, $dragElPar, $dropUnit, type) {
		var dealers = $toel.data('zdglist').dropPreDealers;
		for (var i=0; i<dealers.length; i++) {
			dealers[i].apply(null, arguments);
		}
	}

	// after dropped
	function dropEndDeal ($dragel, $dropInUnit, $fromel, $toel, $dragElPar, $dropUnit, type) {
		var dealers = $toel.data('zdglist').dropEndDealers;
		for (var i=0; i<dealers.length; i++) {
			dealers[i].apply(null, arguments);
		}
	}
	function emptyDealer ($dragElPar) {
		var $fromel = $dragElPar.closest('.'+_class.container);
		// 拖完后如果原来的d-list空了，加个占位符
		var $ul = $fromel.children('ul');
		if (!$ul.children('li').length) {
			$ul.append('<li><div class="'+ _class.empty_handler +'">drop here</div></li>'); 	
		} else { // 被拖li-unit原来的父元素ul空了
			if ($dragElPar && !$dragElPar.children('li').length) {
				$dragElPar.remove();
			}
		}	
	}

	// util functions
	function getDepth ($li) {
		var $ul = $li.children('ul');
		if (!$ul.length) {
			return 1;
		}
		var $lis = $ul.children('li');
		var max = 0, lv;
		for (var i=0; i<$lis.length; i++) {
			lv = getDepth($lis.eq(i));
			max = max<lv ? lv : max;
		}
		return max+1;
	}
	function getLvl ($li) {
		var lvl = 0;
		while (!$li.hasClass(_class.container)) {
			$li = $li.parent().parent();
			lvl ++;
		}
		return lvl;
	}

	// generate
	function genHTML (unit) {
		var html = '<li draggable="true" class="' + _class.li_unit + '">'
			+ '<div class="' + _class.up_placer + ' '+_class.drop_placer+'">'+_class.up_plc_html+'</div>'
			+ '<div class="' + _class.div_handler + ' '+_class.drop_placer+'"><span class="' + _class.name_span + '">' + (unit.name||'') + '</span></div>'
			+ '<div class="' + _class.down_placer + ' '+_class.drop_placer+'">'+_class.down_plc_html+'</div>'
			+ '</li>';
		var $li = $(html);
		for (var k in unit) {
			if (k === 'children') {
				var $ul = $('<ul class="' + _class.ul_list + '"></ul>');
				for (var i=0; i<unit.children.length; i++) {
					$ul.append(genHTML(unit.children[i]));
				}
				$li.append($ul);
			} else {
				$li.data(k, unit[k]);
			}
		}
		return $li;
	}

	// append new li-unit
	function appendNew (name) { // called by a ZDgList object
		var html = '<li draggable="true" class="'+_class.li_unit+'">'
		+ '<div class="'+_class.up_placer+' '+_class.drop_placer+'">'+_class.up_plc_html+'</div>'
		+ '<div class="'+_class.div_handler+' '+_class.drop_placer+'"><span class="'+_class.name_span+'">'+name+'</span><i class="fa fa-gavel cg-btn"></i></div>'
		+ '<div class="'+_class.down_placer+' '+_class.drop_placer+'">'+_class.down_plc_html+'</li>';
		var $n = $(html);
		$n.hide();
		var $ul = this.$el.children('.'+_class.ul_list).eq(0);
		$ul.append($n);
		var $empty = $ul.children().eq(0);
		if ($empty.children().hasClass(_class.empty_handler)) {
			$empty.remove();
		}
		$n.show(500);
		return $n;
	}

	// get json of list
	function getJson () { // called by a ZDgList object
		var cli = '.'+_class.li_unit,
			cul = '.'+_class.ul_list,
			cname = '.'+_class.name_span;
		function get ($ul) {
			var arr = [], obj;
			var $lis = $ul.children(cli);
			$lis.each(function (i, v) {
				v = $(v);
				var data = v.data();
				obj = $.extend(true, {}, data);
				obj.name = v.find(cname).html();
				var $liul = v.children(cul);
				if ($liul.length && $liul.children(cli).length) {
					obj.children = get($liul);
				}
				arr.push(obj);
			});
			return arr;
		}
		return JSON.stringify(get(this.$el.children(cul)));
	}

	$.fn.draggableList = function (type) {
		var slice = Array.prototype.slice;
		var dt;
		if (type === 'init') {
			return init.apply(this, slice.call(arguments, 1));
		} else if (type === 'changeClasses') {
			_class = $.extend(_class, arguments[1]);
		} else { return; }
	};
})(window.jQuery, window, document);