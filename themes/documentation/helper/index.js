module.exports = function () {
	return {
        /**
         * Handlebars Comparison Helpers
         * Copyright (c) 2013 Jon Schlinkert, Brian Woodward, contributors
         * Licensed under the MIT License (MIT).
         * https://github.com/helpers/handlebars-helpers/blob/a3683bab5519882927de527077c34a98ac22067b/lib/comparison.js#L48
         * Modified to fit Sonar Website
         */
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
		compare: function (left, operator, right, options) { // eslint-disable-line object-shorthand
			if (arguments.length < 3) {
				throw new Error('Handlebars Helper "compare" needs 2 parameters');
			}

			if (!options) {
				/*eslint-disable no-param-reassign*/
				options = right;
				right = operator;
				operator = '===';
				/*eslint-enable no-param-reassign*/
			}

			const operators = {
				'!=': (l, r) => {
					return l !== r;
				},
				'!==': (l, r) => {
					return l !== r;
				},
				'<': (l, r) => {
					return l < r;
				},
				'<=': (l, r) => {
					return l <= r;
				},
				'==': (l, r) => {
					return l === r;
				},
				'===': (l, r) => {
					return l === r;
				},
				'>': (l, r) => {
					return l > r;
				},
				'>=': (l, r) => {
					return l >= r;
				},
				typeof: (l, r) => {
					return typeof l === r;
				},
				'||': (l, r) => {
					return l || r;
				}
			};

			if (!operators[operator]) {
				throw new Error(`Handlebars Helper "compare" doesn't know the operator ${operator}`);
			}

			const result = operators[operator](left, right);

			if (result) {
				return options.fn(this);
			}

			return options.inverse(this);
		},
		getAboutItems: (navs) => {
			// `navs` is the menu data saved in `menu.yml`.
			return navs[2].items;
		},
		getDocumentItems: (navs) => {
			// `navs` is the menu data saved in `menu.yml`.
			return navs[1].items;
		},
		getSubPages: function (allPages, category) { // eslint-disable-line object-shorthand
			return allPages.reduce((acc, page) => {
				if (page.category === category) {
					const tocTitle = page['toc-title'];

					if (!acc[tocTitle]) {
						acc[tocTitle] = [page];
					} else {
						acc[tocTitle].push(page);
					}
				}

				return acc;
			}, {});
		},
		hasSubPage: function (id, options) { // eslint-disable-line object-shorthand
			const result = (id === 'docs' || id === 'about');

			if (result) {
				return options.fn(this);
			}

			return options.inverse(this);
		}
	};
};
