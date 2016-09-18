
;(function ($, window, document, undefined) {

	var _class = {
		container: 'zdl-container',
		ul_list: 'zdl-ul',
		li_unit: 'zdl-unit',
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
				dragel: null
			},
			relation: option.allows,
			maxlevel: option.maxlevel || null,
			$hinter: option.hinter || null,
			dropchecker: [],
			dropPreDealers: [],
			dropEndDealers: []
		};
		this.data('zdglist', zdgdata);
		if (option.maxlevel) {
			zdgdata.dropchecker.push(check_maxlvl);
		}
		zdgdata.dropEndDealers.push(emptyDealer);
		bind(this);
	};

	function bind ($el) {
		var st = $el.data('zdglist').status;
		$el.on('dragstart', '.'+_class.li_unit, function (ev) {
			dragstart_handler(ev, st);
		}).on('dragend', '.'+_class.li_unit, function (ev) {
			dragend_handler(ev);
		})
		// .on('dragenter', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
		// 	dragmoveon_handler(ev, $el, 'enter'); // dragenter在li内元素上触发时，会先触发enter后触发父元素的leave，背景色就无效了 所以这里改在over里设背景色
		// })
		.on('dragover', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'over');
		}).on('dragleave', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'leave');
		}).on('drop', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
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
			var dragel = $from.data('zdglist').status.dragel;
			var args = [$(dragel), $(this).closest('.'+_class.container), $from, $el];
			if (!dropCheck.apply(null, args)) { return; }			
			// $(this).parent().parent().append(dragel);
			// $(this).parent().remove();
			// dropEndDeal.apply(null, args);
			var $that = $(this).parent().parent();
			$(this).parent().remove();
			$(dragel).hide(100, function () {
				$that.append(dragel);
				dropEndDeal.apply(null, args);
				$(dragel).show(100);
			});
		});
	}

	var _dragFromEl;
	function dragstart_handler (ev, st) {
		st.draging = true;
		st.dragel = ev.target;
		_dragFromEl = st.elid;
	}
	function dragend_handler (ev) {
		if (!_dragFromEl) {return;}
		var st = $('#'+_dragFromEl).data('zdglist').status;
		st.draging = false;
		st.dragel = null;
		_dragFromEl = null;
	}
	function dragmoveon_handler (ev, $el, type) {
		// if (!$(ev.target).hasClass('zdl-plcr')) { return; }
		var $tgt = $(ev.target).closest('.zdl-plcr');
		var dt = $el.data('zdglist');
		var st = dt.status;
		if (!st.draging && dt.relation.indexOf(_dragFromEl)<0) { // 也不是从其他允许的list里拖过来的
			return;
		}
		if (st.draging && st.dragel === $tgt.parent()[0]) {
			return; // 自己拖到自己
		}
		switch (type) {
			// case 'enter':
			// 	$tgt.css({background: '#6495ED', color: '#fff'});		
			// 	break;
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
		var $droparea = $(ev.target).closest('.zdl-plcr');
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
			args = [$(dragel), $unit, $from, $el];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			var $ul = $unit.children('.'+_class.ul_list).eq(0);
			if (!$ul.length) {
				$ul = $('<ul class="' + _class.ul_list + '"></ul>');
				$unit.append($ul);
			}
			$ul.append(dragel);
			dropEndDeal.apply(null, args);
		} else if ($droparea.hasClass(_class.up_placer)) {
			args = [$(dragel), $unit.parent().parent(), $from, $el];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			$(dragel).insertBefore($unit);
			dropEndDeal.apply(null, args);
		} else {
			args = [$(dragel), $unit.parent().parent(), $from, $el];
			if (!dropCheck.apply(null, args)) {
				return false;
			}
			dropPreDeal.apply(null, args);
			$(dragel).insertAfter($unit);
			dropEndDeal.apply(null, args);
		}
	}

	// drop check
	function dropCheck ($dragel, $plel, $fromel, $toel) { // 拖动元素，置于其内的元素， 从哪个list拖过来，拖到的list
		var checkers = $toel.data('zdglist').dropchecker;
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
			dt.$hinter.html('最大层级为' + dt.maxlevel);
			return false;
		}
		return true;
	}
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

	// before dropped
	function dropPreDeal ($dragel, $plel, $fromel, $toel) {
		var dealers = $toel.data('zdglist').dropPreDealers;
		for (var i=0; i<dealers.length; i++) {
			dealers[i].apply(null, arguments);
		}
	}

	// after dropped
	function dropEndDeal ($dragel, $plel, $fromel, $toel) {
		var dealers = $toel.data('zdglist').dropEndDealers;
		for (var i=0; i<dealers.length; i++) {
			dealers[i].apply(null, arguments);
		}
	}
	function emptyDealer ($dragel, $plel, $fromel, $toel) {
		var $ul = $fromel.children('ul');
		if ($ul.children('li').length) { return; }
		var html = '<li><div class="'+ _class.empty_handler +'">drop here</div></li>';
		$ul.append(html);
	}

	function genHTML (unit) {
		var html = '<li draggable="true" class="' + _class.li_unit + '">'
			+ '<div class="' + _class.up_placer + ' zdl-plcr">up</div>'
			+ '<div class="' + _class.div_handler + ' zdl-plcr"><span class="' + _class.name_span + '">' + (unit.name||'') + '</span></div>'
			+ '<div class="' + _class.down_placer + ' zdl-plcr">down</div>'
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