
;(function ($, window, document, undefined) {

	var _class = {
		container: 'zdl-container',
		ul_list: 'zdl-ul',
		li_unit: 'zdl-unit',
		up_placer: 'zdl-uppl',
		down_placer: 'zdl-downpl',
		div_handler: 'zdl-handler'
	};

	var init = function (list, option) {
		var $list = $('<ul></ul>');
		$(list).each(function (i, v) {
			$list.append(genHTML(v));
		});
		this.addClass(_class.container).append($list);
		var zdgdata = {
			status: {
				elid: this.attr('id'),
				draging: false,
				dragel: null
			},
			relation: option.allows,
			maxlevel: option.maxlevel || null,
			dropchecker: []
		};
		this.data('zdglist', zdgdata);
		if (option.maxlevel) {
			zdgdata.dropchecker.push(check_maxlvl);
		}
		bind(this);
	};

	function check_maxlvl ($dragel, $plel, $fromel, $toel) {
		var max = $toel.data('zdglist').maxlevel;
		var dep = getDepth($dragel),
			lvl = getLvl($plel);
		return dep + lvl > max ? false : true;
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

	function bind ($el) {
		var st = $el.data('zdglist').status;
		$el.on('dragstart', '.'+_class.li_unit, function (ev) {
			dragstart_handler(ev, st);
		}).on('dragend', '.'+_class.li_unit, function (ev) {
			dragend_handler(ev, st);
		}).on('dragenter', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'enter');
		}).on('dragover', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'over');
		}).on('dragleave', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
			dragmoveon_handler(ev, $el, 'leave');
		}).on('drop', '.'+_class.div_handler+',.'+_class.up_placer+',.'+_class.down_placer, function (ev) {
			drop_handler(ev, st, $el);
		});
	}

	var _dragFromEl;

	function dragstart_handler (ev, st) {
		st.draging = true;
		st.dragel = ev.target;
		_dragFromEl = st.elid;
	}
	function dragend_handler (ev, st) {
		st.draging = false;
		st.dragel = null;
		_dragFromEl = null;
	}
	function dragmoveon_handler (ev, $el, type) {
		var dt = $el.data('zdglist');
		var st = dt.status;
		if (!st.draging && dt.relation.indexOf(_dragFromEl)<0) { // 也不是从其他允许的list里拖过来的
			return;
		}
		if (st.draging && st.dragel === $(ev.target).parent()[0]) {
			return; // 自己拖到自己
		}
		switch (type) {
			case 'enter':
				$(ev.target).css({background: '#c33'});		
				break;
			case 'over':
				ev.preventDefault();	
				break;	
			case 'leave':
				$(ev.target).css({background: ''});
				break;
			default: break;
		}
	}
	function drop_handler (ev, st, $el) {
		ev.preventDefault();
		var $droparea = $(ev.target);
		$droparea.css({background: ''});
		var st = st;
		var $unit = $droparea.parent();
		var dragel;
		if (st.draging) {
			dragel = st.dragel;
		} else { // 从别的list拖过来的
			var $from = $('#'+_dragFromEl);
			dragel = $from.data('zdglist').status.dragel;
		}

		if ($droparea.hasClass(_class.div_handler)) {
			if (!dropCheck($(dragel), $unit, $from, $el)) {
				return false;
			}
			var $ul = $unit.children('.'+_class.ul_list).eq(0);
			if (!$ul.length) {
				$ul = $('<ul class="' + _class.ul_list + '"></ul>');
				$unit.append($ul);
			}
			$ul.append(dragel);
		} else if ($droparea.hasClass(_class.up_placer)) {
			if (!dropCheck($(dragel), $unit.parent().parent(), $from, $el)) {
				return false;
			}
			$(dragel).insertBefore($unit);
		} else {
			if (!dropCheck($(dragel), $unit.parent().parent(), $from, $el)) {
				return false;
			}
			$(dragel).insertAfter($unit);
		}
	}
	function dropCheck ($dragel, $plel, $fromel, $toel) {
		var checker = $toel.data('zdglist').dropchecker;
		for (i=0; i<checker.length; i++) {
			if (!checker[i].apply(null, arguments)) {
				console.log('wrong');
				return false;
			}
		}
		return true;
	}

	function genHTML (unit) {
		var html = '<li draggable="true" class="' + _class.li_unit + '">'
			+ '<div class="' + _class.up_placer + '"></div>'
			+ '<div class="' + _class.div_handler + '">' + (unit.name||'') + '</div>'
			+ '<div class="' + _class.down_placer + '"></div>'
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

	$.fn.draggableList = init;
})(window.jQuery, window, document);