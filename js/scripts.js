$(function() {

	$("#radio").buttonset();
	$("#quotes").sortable();
	$("#quotes").disableSelection();
	$("#button").button();
	
	$(".quote_wrap").live({
		mouseover: function() {
			$(this).find(".delete, .edit").show();
		},
		mouseout: function() {
			$(this).find(".delete, .edit").hide();
		}
	});

	// RADIO BUTTONS 
	
	var RadioButtons = {
		radio_buttons: ["TV", "Movie", "Book", "Person"],
		
		openButton: function(index) {
			for (var i = 0; i < this.radio_buttons.length; i++) {
				if (this.radio_buttons[i] != this.radio_buttons[index]) {
					$("." + this.radio_buttons[i]).hide();
				}
				else {
					$("." + this.radio_buttons[i]).fadeIn("slow");
				}
			}
		},
		
		init: function() {
			for (var i = 0; i < this.radio_buttons.length; i++) {
				var _this = this;
				$("#" + this.radio_buttons[i]).prop("index", i);
				$("#" + this.radio_buttons[i]).click(function() {
					_this.openButton(this.index);
				});
			}	
		}
	}

	RadioButtons.init();
	
	// EVENT MODEL
	
	var Event = function(sender) {
		this.sender = sender;
		this.listeners = [];
	}
	
	Event.prototype = {
		attach: function(listener) {
			this.listeners.push(listener);
		},
		
		notify: function(arg) {
			// fourth stop
			for (var i = 0; i < this.listeners.length; i++) {
				this.listeners[i](arg);
			}
		}
	}
		
	// QUOTE MODEL
	
	var QuoteModel = function(id, collection) {
		this.id = id;
		this.visible = true;
		this.collection = collection;
	}
	
	QuoteModel.prototype = {
		addAttrs: function(args) {
			for (var attr in args) { 
				this[attr] = args[attr];
			}
		}
	}

	// COLLECTION MODEL
	
	var CollectionModel = function(quotes) {
		this.quotes = quotes;
		this.quoteDict = {
			'TV': {'episode': [], 'show': []},
			'Movie': {'movie': []},
			'Book': {'book': [], 'author':[]},
			'Person': {'person': []}
		}
		this.storage = JSON.parse(localStorage.getItem('store')) || {};
		this.observer = new Event(this);
	}
	
	CollectionModel.prototype = {
	
		makeQuoteModel: function(quote_object) {
			if (!this.editQuote) {
				var id = Math.floor(Math.random()*1000);
				var model = new QuoteModel(id, this);
				model.addAttrs(quote_object);
				quote_object.id = id;
				this.addQuoteModel(model);
			}
			else {
				this.editQuoteModel(quote_object);
				this.editQuote = null;
			}
			this.saveQuoteModel(quote_object);
		},
		
		// third stop
		addQuoteModel: function(quote) {
			this.quotes.push(quote);
			var attrs = this.quoteDict[quote.type];
			for (var attr in attrs) {
				if (attrs[attr].indexOf(quote[attr]) == -1) {
					attrs[attr].push(quote[attr]);
				}
				else {
					attrs[attr] = [quote[attr]];
				}
			}
			this.observer.notify(true);
		},
		
		delQuoteModel: function(quote) {
			delete this.quotes[this.quotes.indexOf(quote)];
			delete this.storage[quote.id];
			localStorage.setItem('store', JSON.stringify(this.storage));
			this.observer.notify(true);
		},
		
		beingEdited: function(model) {
			this.editQuote = model;
			this.observer.notify(false);
		},
		
		editQuoteModel: function(quote_object) {
			this.editQuote.addAttrs(quote_object);
			this.observer.notify(true);
		},
		
		saveQuoteModel: function(quote_object) {
			this.storage[quote_object.id] = quote_object;
			localStorage.setItem('store', JSON.stringify(this.storage));
		},
		
		quoteTypes: function() {
			var types = [];
			for (var attr in this.quoteDict) {
				types.push(attr);
			}
			return types;
		},
		
		quoteTypeAttrs: function(source) {
			var attrs = [];
			for (var attr in this.quoteDict[source]) {
				attrs.push(attr);
			}
			return attrs;
		},
		
		filter: function(type, attr, attr_value) {
			for (var i = 0; i < this.quotes.length; i++) {
				if (type != "all" && this.quotes[i].type != type) {
					this.quotes[i].visible = false;
				}
				else if (attr && this.quotes[i][attr] != attr_value) {
					this.quotes[i].visible = false;
				}
				else {
					this.quotes[i].visible = true;
				}
			}
			this.observer.notify(false);
		},
		 

	}
	
	// QUOTE VIEW
	
	var QuoteView = function(model, controller, elements) {
		this.model = model;
		this.model.view = this;
		this.controller = controller;
		this.elements = {};
	}
			
	QuoteView.prototype = {
		
		render: function() {
			var el = document.createElement('li');
			el.setAttribute('class', 'quote_wrap');
			this.elements.el = $(el);
			var template = Handlebars.compile($('#' + this.model.type + "-template").html());
			this.elements.el.html(template(this.model));
			this.attachEvents();
 			return this;
		},
		
		attachEvents: function() {
			var _this = this;
			this.elements.del = this.elements.el.find('.delete');
			this.elements.edit = this.elements.el.find('.edit');
			this.elements.del.click(function() {
 				_this.controller.delQuoteController(_this.model);
 			});
 			this.elements.edit.click(function() {
 			 	_this.controller.editQuoteController(_this.model);
 			});
		},
		
		editMode: function() {
			$("textarea").val(this.model.quote_pure);
			$("#" + this.model.type).click();
			var attrs = this.model.collection.quoteTypeAttrs(this.model.type);
			for (var i = 0; i < attrs.length; i++) {
				$("input[name=" + attrs[i] + "]").val(this.model[attrs[i]])
			}
		}
	}
	
	// COLLECTION VIEW

	var CollectionView = function(model, controller, elements) {
		this.model = model;
		this.controller = controller;
		this.elements = elements;
		var _this = this;
		
		this.model.observer.attach(function(renderTags) {
			_this.render(renderTags);
		});
	}
	
	CollectionView.prototype = {
	
		render: function(renderTags) {
			var quotes = this.model.quotes;
			this.elements.collection.html("");
			for (var i = 0; i <= quotes.length; i++) {
				if (quotes[i] && quotes[i].visible) {
					var view = new QuoteView(quotes[i], this.controller);
					this.elements.collection.append(view.render().elements.el);
				}
			}
			if (renderTags) {
				this.renderTags();
			}
			$("textarea, input").val("");
		},
		
		load: function() {
			var _this = this;
			var dict = this.model.storage;
			//var dict = JSON.parse(localStorage.getItem('store'));
 			for (var attr in dict) {
 				var model = new QuoteModel(dict[attr]['id'], this.model);
 				model.addAttrs(dict[attr]);
 				this.model.addQuoteModel(model);
 			}
 			this.attachEvents();

		},
		
		renderTags: function() {
			var _this = this;
			this.elements.tags.html("");

 			var quoteTypes = this.model.quoteTypes();
 			// a little hackish
 			var sublist_array = [];
 			var arrow_array = [];
 			for (var i = 0; i < quoteTypes.length; i++) {
 				var li = $("<li/>").appendTo(this.elements.tags);
 				var template = Handlebars.compile($('#tag-template').html());
				li.html(template({text: quoteTypes[i]}));
				var ul = $("<ul/>").appendTo(li);
				sublist_array.push(ul);
				var a = li.find("a");
				var arrow = li.find(".arrow-right");
				arrow_array.push(arrow);
				a.data({type: quoteTypes[i], ul: ul, arrow: arrow});
				a.click(function() {
					sublist = $(this).data('ul');
					if (sublist.css('display') == 'none') {
						_this.model.filter($(this).data('type'), null, null);
						for (var k = 0; k < sublist_array.length; k++) {
							sublist_array[k].slideUp();
							arrow_array[k].attr('class', 'arrow-right');
						}
						$(this).data('arrow').attr('class', 'arrow-down');
						sublist.slideDown();
						$(this).data('open', true);
					}
					else {
						_this.model.filter("all", null, null);
						$(this).data('arrow').attr('class', 'arrow-right');
						sublist.slideUp();
						$(this).data('open', false);
					}
				});
				var attrs = this.model.quoteDict[quoteTypes[i]];
 				for (var attr in attrs) {
 					// this next line is a hack
 					if ((attr != "episode") && (attr != "author")) {
						for (var j = 0; j < attrs[attr].length; j++) {
							var li = $("<li/>").appendTo(ul);
							var a = $("<a/>", {
								href: "#",
								text: attrs[attr][j],
							}).appendTo(li);
							a.data({type: quoteTypes[i], attr: attr, attr_value: attrs[attr][j]});
							a.click(function() {
								_this.model.filter($(this).data('type'), $(this).data('attr'), $(this).data('attr_value'));
							});
						}
					}
 				}
 			}
		},
		
		attachEvents: function() {
			var _this = this;
			this.elements.add.click(function() {
				// first stop
				var quote_object = {};
				if (_this.model.editQuote) {
					quote_object.id = _this.model.editQuote.id;
				}
				quote_object.quote = _this.makeQuote();
				quote_object.quote_pure = $("textarea").val() || "Default quote";
				quote_object.type = $("input:checked").attr("id");
				var attrs = _this.model.quoteTypeAttrs(quote_object.type);
				for (var i = 0; i < attrs.length; i++) {
					quote_object[attrs[i]] = $("input[name=" + attrs[i] + "]").val() || "Default " + attrs[i];
				}
				_this.controller.addQuoteController(quote_object);
			});
		},
		
		makeQuote: function() {
			var quotes = $("textarea").val().split("\n");
			for (var i = 0; i < quotes.length; i++) {
				var colon_pos = (quotes[i]).indexOf(":");
				if (colon_pos != -1) {
					var name = quotes[i].substring(0, colon_pos + 1);
					var says = quotes[i].substring(colon_pos + 1);
					if (i % 2 == 0) {
						var css = "name1";
					}
					else {
						var css = "name2";
					}
					quotes[i] = "<span class=\"" + css + "\">" + name + "</span>" + says;
				}
			}
			return quotes.join('<br/>') || "Default quote";
		}
	
	}
	
	// CONTROLLER
	
	var CollectionController = function(model) {
		this.model = model;
	}
	
	CollectionController.prototype = {
		// second stop
		addQuoteController: function(quote_object) {
			this.model.makeQuoteModel(quote_object);
		},
		
 		delQuoteController: function(model) {
 			this.model.delQuoteModel(model);
 		},
 		
 		editQuoteController: function(model) {
 			this.model.beingEdited(model);
 			model.view.editMode();
 		}

	}

	$(function() {
		var model = new CollectionModel([]);
		var view = new CollectionView(model, new CollectionController(model),
			{
				'collection' : $('#quotes'), 
				'add' : $('#button'),
				'tags': $('#tags')
			}
		);
		view.load();
	});
	

});