import { Grid } from './core/Grid.js';

/**
 * jQuery плагин для CM Data Grid
 */
(function($) {
    'use strict';

    const DATA_KEY = 'cmDataGrid';

    /**
     * Инициализация CM Data Grid
     * @param {Object} config - Конфигурация таблицы
     * @returns {jQuery}
     */
    $.fn.cmDataGrid = function(config) {
        return this.each(function() {
            let instance = $.data(this, DATA_KEY);

            if (!instance) {
                instance = new Grid(this, config);
                $.data(this, DATA_KEY, instance);
            }
        });
    };

    /**
     * Получение экземпляра таблицы
     * @returns {Grid|undefined}
     */
    $.fn.getCmDataGrid = function() {
        return this.data(DATA_KEY);
    };

    /**
     * Уничтожение таблицы
     * @returns {jQuery}
     */
    $.fn.destroyCmDataGrid = function() {
        return this.each(function() {
            const instance = $.data(this, DATA_KEY);
            if (instance) {
                instance.destroy();
                $.removeData(this, DATA_KEY);
            }
        });
    };

})(jQuery);
