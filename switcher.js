$.fn.extend({
	switcher:function(items,opts){
		return new switcher(this,items,opts);
	},
	_translate:function(x,y,rotate,scale,units){
		var prefix = ['moz','o','ms','webkit'];
		if (!x) x = 0;
		if (!y) y = 0;
		if (!rotate) rotate = 0;
		if (!scale) scale = 1;
		if (!units) units = 'px';

		this._translated = {top:y,left:x,rotate:rotate,scale:scale,units:units};

		for (var i in prefix){
			$(this).css('-'+prefix[i]+'-transform', 'translate3d('+x+''+units+','+y+''+units+',0'+units+') rotate('+rotate+'deg) scale('+scale+')');
		}
		return this;
	},
	move:function(x,y){
		var pos = this.getPosition();
		if (!x) x = 0;
		if (!y) y = 0;
		this._translate(pos.left + x,pos.top + y);
		return this;
	},
	getTranslated:function(){
		return this._translated;
	},
	getPosition:function(){
		if (!this._translated){
			return this.position();
		} else {
			return this._translated;
		}
	},
	getCenter:function(){
		if (!this._translated){
			return {left: $(this).position().left + $(this).outerWidth()/2 , top:$(this).position().top+ $(this).outerHeight()/2};
		} else {			
			return {left: this._translated.left + $(this).outerWidth()/2 , top:this._translated.top+ $(this).outerHeight()/2};
		}
	},
});



function switcher(container,items,opts){
	this._events = new events(this);
	this._container = $(container);
	
	this._opts = {
		tension:0.6,
		chageVelocity:1.5,
		speed:200,
		minIndex:false,
		maxIndex:false,
		html:false,
	};


	if (opts){
		for (var i in opts){
			this._opts[i] = opts[i];
		}
	}

	this._items = items;

	this.init();
}

switcher.prototype = {
	init:function(){
		this._index = 0;
		this._delay = 10;
		this._lastEvent = false;
		this._paneContainer = $('<div id="sw-panecontainer"></div>');
		
		this._panes = [
			$('<div id="pane-1" class="sw-pane"></div>'),
			$('<div id="pane-2" class="sw-pane"></div>'),
			$('<div id="pane-3" class="sw-pane"></div>')
		];


		for (var i in this._panes){
			this._paneContainer.append(this._panes[i]);
			
			this._panes[i].css({
				'position':'absolute',
				'top':'0px',
				'left':'0px',
				'width':'100%',
				'height':'100%',
				'overflow':'hidden'
			});
		}

		this._paneContainer.css({
			width:'100%',
			height:'100%',
			'overflow':'hidden'
		});

		this._container.html(this._paneContainer);


		var me = this;

		this._container.hammer().on('drag',function(e){
			e.preventDefault();
		
			if (e.timeStamp > me._lastEvent.timeStamp + me._delay || me._lastEvent == false){			
				me._onDrag(e.gesture);
				e.preventDefault();
				me.fire('drag',e);				
			}
		});

		this._container.hammer().on('dragstart',function(e){
			e.preventDefault();
			me._lastEvent = false;
			me._sw = false;
			me.fire('dragstart',e);			
		});

		this._container.hammer().on('dragend',function(e){
			e.preventDefault();
			me.fire('dragend',e);
			me._dragEnd(e);
			me._lastEvent = false;			
		});


		this.reset();
		$(window).resize(function(){
			me.reset();
		})
	},
	reset:function(){
		var startX = 0-this._container.innerWidth();
		for (var i in this._panes){			
			this._panes[i]._translate(startX + (this._panes[i].outerWidth()*i));
			if (this._opts.html){
				this._panes[i].html(this._getListItem(i));
			}
		}
		this._setIndex();
		
		this.fire('change',this._panes,this._index);
		this.fire('start',this._panes);		
	},
	getPanes:function(){
		return this._panes;
	},
	eachpane:function(fn){
		for (var i in this._panes){
			fn.call(this._panes[i],i);
		}
	},
	_onDrag:function(e){
		var x = 0;
		if (this._lastEvent){
			x = e.deltaX - this._lastEvent.deltaX;
		} else {
			x = e.deltaX;
		}
		this.move(x);

		this._lastEvent = e;
	},
	_dragEnd:function(e){	
		if (this._lastEvent.velocityX > this._opts.chageVelocity || Math.abs(this._lastEvent.deltaX) > (this._opts.tension*this._panes[1].outerWidth())){
			if (this._sw == false){			
				
				if (this._lastEvent.direction == 'left'){
					this.next();
				} else {
					this.prev();
				}
				
			} else if (this._getCenterOffset()){		
				this._animate(0-this._getCenterOffset());			
			}
	
		} else if (this._getCenterOffset()){			
			this._animate(0-this._getCenterOffset());			
		}	
	},
	move:function(x){
		for (var i in this._panes){
			this._panes[i].move(x);
		}
		this._checkPosition();
	},
	_checkPosition:function(){
		if (this._panes[1].getPosition().left <= (0-this._panes[1].outerWidth())/2 ){		
			this._swRight();
			this._sw = true;			
		} else if (this._panes[1].getPosition().left >= this._panes[1].outerWidth()/2 ){					
			this._swLeft();
			this._sw = true;						
		}
	},	
	_setIndex:function(){
		var c = -1;
		for (var i in this._panes){
			this._panes[i].attr('sw-index',this._index+c);
			c++;	
		}
	},
	_swLeft:function(){
		this._index--;
		this._panes[2]._translate( this._panes[0].getPosition().left - this._panes[2].outerWidth() );
		this._panes[2].attr('sw-index',this._index-1);

		if (this._opts.html && this._checkChanged()){
			var page = this._getListItem(this._index-1);
			this._panes[2].html(page);
		} else {
			this._checkChanged();
		}

		this.fire('switch',this._panes[2]);
		this._panes.unshift( this._panes.pop() );
	},
	_swRight:function(){
		this._index++;
		this._panes[0]._translate( this._panes[2].getPosition().left + this._panes[2].outerWidth() );
		this._panes[0].attr('sw-index',this._index+1);

		if (this._opts.html && this._checkChanged()){
			var page = this._getListItem(this._index+1);
			this._panes[0].html(page);
		} else {
			this._checkChanged();
		}
		
		this.fire('switch',this._panes[0]);
		this._panes.push( this._panes.shift() );
	},
	_getCenterOffset:function(){		
		return this._panes[1].getPosition().left;
	},
	next:function(){
		this._animate( -this._panes[2].getPosition().left );
		this.fire('next', this._panes[2] );		
	},
	prev:function(){
		this._animate( -this._panes[0].getPosition().left );		
		this.fire('prev', this._panes[0] );
	},
	_checkChanged:function(){

		if (this._prevCenter != this._panes[1]){
			this.fire('change',this._panes,this._index);		
			this._prevCenter = this._panes[1];			
		}

		return this._prevCenter != this._panes[1];
	},
	_animate:function(distance,duration){		
		var lastStep = 0,
			me = this;
		if (!this._dummy){
			this._dummy = $('<div />');
		}

		this._animating = true;
		this._dummy.stop();
		this._dummy.css('width','100px');

		this._dummy.animate({
			width:0
		},{
			step:function(step){
				var cdist = (step-100) * (distance/100);					
				me.move( -(cdist-lastStep));
				lastStep = cdist;
			},
			complete:function(){
				me._animating = false;
				me._checkPosition();	

			},
			duration: duration || this._opts.speed || 150
		});			
	},
	setList:function(list){
		this._items = list;
	},
	getList:function(){
		return this._items;
	},


	getIndex:function(){
		return this._index;
	},
	getItemForPane:function(pane){
		return this._getListItem(parseInt(pane.attr('sw-index')));
	},
	getListItem:function(index){
		if (index === undefined){
			index = this._index;
		}

		if (this._items.length > 0){
			return this._getListItem( index );
		} else {
			return this._index;
		}
	},
	_getListItem:function(index){
		if (this._items.length > 0){		
			if (index >= this._items.length){
				return this._getListItem( index - this._items.length);
			}  else if (index < 0){	
				return this._getListItem(this._items.length + index);
			} else {
				return this._items[index];
			}
		} else return false;
	},
	_getListIndex:function(index){
		if (index >= this._items.length){
			return this._getListIndex( index - this._items.length);
		}  else if (index < 0){								
			return this._getListIndex(this._items.length + index);
		} else {
			return index;
		}
	},
	_getListItemIndex:function(item){
		for (var i in this._items){
			if (this._items[i] == item){
				return i;
			}
		}
	},	
}

function events(parent){	
	this._listeners = [];
	this._parent = parent;
	var me = this;

	this._parent.on = function(name,fn){
		me._on(name,fn);
	}

	this._parent.fire = function(evt,data,e){
		me._fire(evt,data,e);
	}

	this._parent.off = function(evt){
		me._off(evt);
	}
}	

events.prototype = {
	_on:function(name,fn){		
		if (this._listeners[name] == undefined){
			this._listeners[name] = Array();
		}	
		this._listeners[name].push(fn);		
	},
	_fire : function(evt,data,e){		
		for (var i in this._listeners['all']){			
			if (this._listeners['all'][i]!=undefined && typeof(this._listeners['all'][i])== 'function'){						
				this._listeners['all'][i].call(this._parent,evt,data,e);
			}
		}
		if (this._listeners[evt]!=undefined){
			for (var i in this._listeners[evt]){
				if (typeof(this._listeners[evt][i])=='function'){
					this._listeners[evt][i].call(this._parent,data,e);
				}
			}			
		}
	},
	_off:function(evt){
		delete this._listeners[evt];
	}
}