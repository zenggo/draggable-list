
;(function ($, window, document, undefined) {

	var _class = {
		container: 'zdl-container',
		ul_list: 'zdl-ul',
		li_unit: 'zdl-unit',
		drop_placer: 'zdl-plcr',
		up_placer: 'zdl-uppl',
		down_placer: 'zdl-downpl',
		div_handler: 'zdl-handler',
		name_span: 'zdl-name',
		empty_handler: 'zdl-empty'
	};

	var init = function (list, option) {
		var $list = $('<ul class="'+_class.ul_list+'"></ul>');
		if (list.length) {
			$(list).each(function (i, v) {
				$list.append(genHTML(v));
			});	
		} else {
			$list.append('<li><div class="'+ _class.empty_handler +'">drop here</div></li>');
		}
		this.addClass(_class.container).append($list);
		var zdgdata = {
			status: {
				elid: this.attr('id'),
				draging: false,
				dragel: null,
				dragelPar: null
			},
			relation: option.allows,
			maxlevel: option.maxlevel || null,
			$hinter: option.hinter || null,
			dropchecker: [],
			dropPreDealers: [],
			dropEndDealers: [],
			fns: {
				getDepth: getDepth,
				getLvl: getLvl,
				getJson: getJson.bind(this),
				emptyDealer: emptyDealer.bind(this),
				appendNew: appendNew.bind(this)
			}
		};
		this.data('zdglist', zdgdata);
		if (option.maxlevel) {
			zdgdata.dropchecker.push(check_maxlvl);
		}
		bind(this);
		return zdgdata;
	};

	// on drag
	function bind ($el) {
		var st = $el.data('zdglist').status;
		$el.on('dragstart', '.'+_class.li_unit, function (ev) {
			dragstart_handler(ev, st);
		}).on('dragend', '.'+_class.li_unit, function (ev) {
			dragend_handler(ev);
		}).on('dragover', '.'+_class.drop_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'over');
		}).on('dragleave', '.'+_class.drop_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'leave');
		}).on('drop', '.'+_class.drop_placer, function (ev) {
			drop_handler(ev, st, $el);
		});
		bindEmptyPlacer($el);
	}
	function bindEmptyPlacer ($el) {
		var dt = $el.data('zdglist');
		var st = dt.status;
		$el.on('dragover', '.'+_class.empty_handler, function (ev) {
			if (st.draging || dt.relation.indexOf(_dragFromEl)>=0) {
				ev.preventDefault();
			}
		}).on('drop', '.'+_class.empty_handler, function (ev) {
			var $from = $('#'+_dragFromEl);
			var st = $from.data('zdglist').status;
			var dragel = st.dragel;
			var args = [$(dragel), $(this).closest('.'+_class.container), $from, $el, $(st.dragelPar)];
			if (!dropCheck.apply(null, args)) { return; }
			var $that = $(this).parent().parent();
			$(this).parent().remove();
			$(dragel).hide(150, function () {
				$that.append(dragel);
				emptyDealer(args[4], $from);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			});
		});
	}

	var _dragFromEl;
	function dragstart_handler (ev, st) {
		if (_dragFromEl) {return;}
		st.draging = true;
		st.dragel = ev.target;
		st.dragelPar = ev.target.parentNode;
		_dragFromEl = st.elid;
	}
	function dragend_handler (ev) {
		if (!_dragFromEl) {return;}
		var st = $('#'+_dragFromEl).data('zdglist').status;
		st.draging = false;
		st.dragel = null;
		st.dragelPar = null;
		_dragFromEl = null;
	}
	function dragmoveon_handler (ev, $el, type) {
		var $tgt = $(ev.currentTarget);
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
				$tgt.css({background: '#6495ED', color: '#fff', opacity: 1});		
				break;	
			case 'leave':
				$tgt.css({background: '', color: '', opacity: ''});
				break;
			default: break;
		}
	}
	function drop_handler (ev, st, $el) {
		ev.preventDefault();
		var $droparea = $(ev.currentTarget);
		$droparea.css({background: '', color: '', opacity: ''});
		var st = st;
		var $unit = $droparea.parent();
		var dragel;
		var $from;
		if (st.draging) {
			dragel = st.dragel;
			$from = $el;
		} else { // 从别的list拖过来的
			$from = $('#'+_dragFromEl);
			dragel = $from.data('zdglist').status.dragel;
		}
		var args;
		if ($droparea.hasClass(_class.div_handler)) {
			args = [$(dragel), $unit, $from, $el, $(st.dragelPar)];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			var $ul = $unit.children('.'+_class.ul_list).eq(0);
			if (!$ul.length) {
				$ul = $('<ul class="' + _class.ul_list + '"></ul>');
				$unit.append($ul);
			}
			$(dragel).hide(150, function () {
				$ul.append(dragel);
				emptyDealer(args[4], $from);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			});
		} else if ($droparea.hasClass(_class.up_placer)) {
			args = [$(dragel), $unit.parent().parent(), $from, $el, $(st.dragelPar)];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			$(dragel).hide(150, function () {
				$(dragel).insertBefore($unit);
				emptyDealer(args[4], $from);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			})
		} else {
			args = [$(dragel), $unit.parent().parent(), $from, $el, $(st.dragelPar)];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			$(dragel).hide(150, function () {
				$(dragel).insertAfter($unit);
				emptyDealer(args[4], $from);
				dropEndDeal.apply(null, args);
				$(dragel).show(150);
			});
		}
	}

	// drop check
	function dropCheck ($dragel, $plel, $fromel, $toel, $dragElPar) { // 拖动元素，置于其内的元素， 从哪个list拖过来，拖到的list, 拖动元素原来的父元素ul
		var dt = $toel.data('zdglist');
		var checkers = dt.dropchecker;
		dt.$hinter.html('');
		for (var i=0; i<checkers.length; i++) {
			if (!checkers[i].apply(null, arguments)) {
				return false;
			}
		}
		return true;
	}
	function check_maxlvl ($dragel, $plel, $fromel, $toel) {
		var dt = $toel.data('zdglist');
		var dep = getDepth($dragel),
			lvl = getLvl($plel);
		if (dep + lvl > dt.maxlevel) {
			dt.$hinter.append('<p>最大层级为' + dt.maxlevel + '</p>')
			return false;
		}
		return true;
	}

	// before dropped
	function dropPreDeal ($dragel, $plel, $fromel, $toel, $dragElPar) {
		var dealers = $toel.data('zdglist').dropPreDealers;
		for (var i=0; i<dealers.length; i++) {
			dealers[i].apply(null, arguments);
		}
	}

	// after dropped
	function dropEndDeal ($dragel, $plel, $fromel, $toel, $dragElPar) {
		var dealers = $toel.data('zdglist').dropEndDealers;
		for (var i=0; i<dealers.length; i++) {
			dealers[i].apply(null, arguments);
		}
	}
	function emptyDealer ($dragElPar, $fromel) {
		// console.log(1);
		$fromel = $fromel || this;
		// 拖完后如果原来的list空了，加个占位符
		var $ul = $fromel.children('ul');
		if (!$ul.children('li').length) {
			$ul.append('<li><div class="'+ _class.empty_handler +'">drop here</div></li>'); 	
		} else { // 被拖元素原来的父元素ul空了
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
			+ '<div class="' + _class.up_placer + ' '+_class.drop_placer+'">up</div>'
			+ '<div class="' + _class.div_handler + ' '+_class.drop_placer+'"><span class="' + _class.name_span + '">' + (unit.name||'') + '</span></div>'
			+ '<div class="' + _class.down_placer + ' '+_class.drop_placer+'">down</div>'
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

	// append new $li
	function appendNew (name) {
		var html = '<li draggable="true" class="'+_class.li_unit+'">'
		+ '<div class="'+_class.up_placer+' '+_class.drop_placer+'">up</div>'
		+ '<div class="'+_class.div_handler+' '+_class.drop_placer+'"><span class="'+_class.name_span+'">'+name+'</span><i class="fa fa-gavel cg-btn"></i></div>'
		+ '<div class="'+_class.down_placer+' '+_class.drop_placer+'">down</div></li>';
		var $n = $(html);
		$n.hide();
		var $ul = this.children('.'+_class.ul_list).eq(0);
		$ul.append($n);
		var $empty = $ul.children().eq(0);
		if ($empty.children().hasClass(_class.empty_handler)) {
			$empty.remove();
		}
		$n.show(500);
		return $n;
	}

	// get json of list
	function getJson () {
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
		return JSON.stringify(get(this.children(cul)));
	}

	$.fn.draggableList = function (type) {
		var slice = Array.prototype.slice;
		var dt;
		if (type === 'init') {
			init.apply(this, slice.call(arguments, 1));
		} else if (dt = this.data('zdglist')) {
			switch (type) {
				case 'onDropCheck':
					dt.dropchecker.push(arguments[1]);
					break;
				case 'clearDropCheck':
					dt.dropchecker = [];
					break;
				case 'onDropPreDeal':
					dt.dropPreDealers.push(arguments[1]);
					break;
				case 'clearDropPreDeal':
					dt.dropPreDealers = [];
					break;
				case 'onDropEndDeal':
					dt.dropEndDealers.push(arguments[1]);
					break;
				case 'clearDropEndDeal':
					dt.dropEndDealers = [];
					break;
				default: break;
			}
		} else { return; }
	};
})(window.jQuery, window, document);