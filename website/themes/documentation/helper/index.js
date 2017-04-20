
module.exports = function (hexo) {
	return {
		/**
		 * {{#compare}}...{{/compare}}
		 *
		 * @credit: OOCSS
		 * @param left value
		 * @param operator The operator, must be between quotes ">", "=", "<=", etc...
		 * @param right value
		 * @param options option object sent by handlebars
		 * @return {String} formatted html
		 *
		 * @example:
		 *   {{#compare unicorns "<" ponies}}
		 *     I knew it, unicorns are just low-quality ponies!
		 *   {{/compare}}
		 *
		 *   {{#compare value ">=" 10}}
		 *     The value is greater or equal than 10
		 *     {{else}}
		 *     The value is lower than 10
		 *   {{/compare}}
		 */
		compare: function (left, operator, right, options) {
			/*eslint-disable eqeqeq*/

			if (arguments.length < 3) {
				throw new Error('Handlebars Helper "compare" needs 2 parameters');
			}

			if (!options) {
				options = right;
				right = operator;
				operator = '===';
			}

			var operators = {
				'==': function (l, r) {
					return l == r;
				},
				'===': function (l, r) {
					return l === r;
				},
				'!=': function (l, r) {
					return l != r;
				},
				'!==': function (l, r) {
					return l !== r;
				},
				'<': function (l, r) {
					return l < r;
				},
				'>': function (l, r) {
					return l > r;
				},
				'<=': function (l, r) {
					return l <= r;
				},
				'>=': function (l, r) {
					return l >= r;
				},
				typeof: function (l, r) {
					return typeof l == r;
				}
			};

			if (!operators[operator]) {
				throw new Error('Handlebars Helper "compare" doesn\'t know the operator ' + operator);
			}

			var result = operators[operator](left, right);

			if (result) {
				return options.fn(this);
			} else {
				return options.inverse(this);
			}
		},
		hasSubPage: function(id, options) {
			var result = (id === 'doc' || id === 'about');
			if (result) {
				return options.fn(this);
			} else {
				return options.inverse(this);
			}
		},
		getDocumentItems: function(data) {
			return data[1].items;
		},
		getAboutItems: function(data) {
			return data[2].items;
		}
	};
};