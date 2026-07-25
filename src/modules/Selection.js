import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Selection - Модуль выборки строк
 */
export class Selection extends EventEmitter {
    /**
     * @param {Object} options - Конфигурация выборки
     */
    constructor(options = {}) {
        super();

        this._options = {
            mode: 'none', // 'none', 'single', 'multiple', 'cell', 'multipleCell'
            checkbox: false,
            persist: false,
            ...options
        };

        this._selected = [];
        this._lastSelected = null;
    }

    /**
     * Обработка клика по строке
     * @param {Object} dataItem - Данные строки
     * @param {Event} event - Событие
     * @returns {boolean} Изменилось ли состояние
     */
    handleRowClick(dataItem, event) {
        if (this._options.mode === 'none') return false;

        const isCtrl = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;

        if (this._options.mode === 'single') {
            return this._singleSelect(dataItem);
        }

        if (this._options.mode === 'multiple') {
            return this._multipleSelect(dataItem, isCtrl, isShift);
        }

        return false;
    }

    /**
     * Обработка клика по ячейке
     * @param {Object} dataItem
     * @param {string} field
     * @returns {boolean}
     */
    handleCellClick(dataItem, field) {
        if (this._options.mode !== 'cell' && this._options.mode !== 'multipleCell') {
            return false;
        }

        const cellKey = `${dataItem.id || dataItem._index}_${field}`;
        const index = this._selected.findIndex(s => s.key === cellKey);

        if (this._options.mode === 'cell') {
            this._selected = index === -1 ? [{ key: cellKey, dataItem, field }] : [];
        } else {
            if (index === -1) {
                this._selected.push({ key: cellKey, dataItem, field });
            } else {
                this._selected.splice(index, 1);
            }
        }

        this.trigger('selectionChange', { selected: this.getSelected() });
        return true;
    }

    /**
     * Одиночная выборка
     */
    _singleSelect(dataItem) {
        const isAlreadySelected = this._selected.includes(dataItem);

        if (isAlreadySelected && this._options.mode === 'single') {
            // В режиме single повторный клик не снимает выделение
            return false;
        }

        this._selected = isAlreadySelected ? [] : [dataItem];
        this._lastSelected = dataItem;

        this.trigger('selectionChange', { selected: this.getSelected() });
        return true;
    }

    /**
     * Множественная выборка
     */
    _multipleSelect(dataItem, isCtrl, isShift) {
        if (isShift && this._lastSelected) {
            // Range selection (упрощенная версия)
            return this._rangeSelect(dataItem);
        }

        if (isCtrl) {
            // Toggle selection
            const index = this._selected.indexOf(dataItem);
            if (index !== -1) {
                this._selected.splice(index, 1);
            } else {
                this._selected.push(dataItem);
            }
        } else {
            // Single selection (без Ctrl)
            this._selected = [dataItem];
        }

        this._lastSelected = dataItem;
        this.trigger('selectionChange', { selected: this.getSelected() });
        return true;
    }

    /**
     * Range selection (упрощенная версия)
     */
    _rangeSelect(dataItem) {
        // Для range selection нужен доступ к данным таблицы
        // Здесь только базовая реализация
        if (!this._lastSelected) {
            this._selected = [dataItem];
        } else {
            // Простая реализация - добавляем от последнего выбранного до текущего
            const start = this._lastSelected;
            const end = dataItem;

            if (!this._selected.includes(start)) {
                this._selected.push(start);
            }
            if (!this._selected.includes(end)) {
                this._selected.push(end);
            }
        }

        this._lastSelected = dataItem;
        this.trigger('selectionChange', { selected: this.getSelected() });
        return true;
    }

    /**
     * Выбор строки
     * @param {Object} dataItem
     */
    select(dataItem) {
        if (!this._selected.includes(dataItem)) {
            this._selected.push(dataItem);
            this.trigger('selectionChange', { selected: this.getSelected() });
        }
    }

    /**
     * Отмена выбора строки
     * @param {Object} dataItem
     */
    unselect(dataItem) {
        const index = this._selected.indexOf(dataItem);
        if (index !== -1) {
            this._selected.splice(index, 1);
            this.trigger('selectionChange', { selected: this.getSelected() });
        }
    }

    /**
     * Переключение выбора
     * @param {Object} dataItem
     */
    toggle(dataItem) {
        const index = this._selected.indexOf(dataItem);
        if (index !== -1) {
            this._selected.splice(index, 1);
        } else {
            this._selected.push(dataItem);
        }
        this.trigger('selectionChange', { selected: this.getSelected() });
    }

    /**
     * Выбрать все
     * @param {Array} dataItems
     */
    selectAll(dataItems) {
        this._selected = [...dataItems];
        this.trigger('selectionChange', { selected: this.getSelected() });
    }

    /**
     * Снять выделение со всех
     */
    unselectAll() {
        this._selected = [];
        this._lastSelected = null;
        this.trigger('selectionChange', { selected: [] });
    }

    /**
     * Получение выбранных элементов
     * @returns {Array}
     */
    getSelected() {
        return [...this._selected];
    }

    /**
     * Получение индексов выбранных строк
     * @param {Array} allData
     * @returns {Array}
     */
    getSelectedIndices(allData) {
        return this._selected
            .map(item => allData.indexOf(item))
            .filter(index => index !== -1);
    }

    /**
     * Проверка, выбран ли элемент
     * @param {Object} dataItem
     * @returns {boolean}
     */
    isSelected(dataItem) {
        return this._selected.includes(dataItem);
    }

    /**
     * Проверка, выбраны ли все элементы
     * @param {Array} dataItems
     * @returns {boolean}
     */
    isAllSelected(dataItems) {
        if (dataItems.length === 0) return false;
        return dataItems.every(item => this._selected.includes(item));
    }

    /**
     * Проверка, частично ли выбраны элементы
     * @param {Array} dataItems
     * @returns {boolean}
     */
    isPartiallySelected(dataItems) {
        const selectedCount = dataItems.filter(item => this._selected.includes(item)).length;
        return selectedCount > 0 && selectedCount < dataItems.length;
    }

    /**
     * Очистка выбора при обновлении данных
     * @param {Array} newData
     */
    clearStaleSelections(newData) {
        if (this._options.persist) return;

        this._selected = this._selected.filter(item => newData.includes(item));
    }

    /**
     * Установка режима выборки
     * @param {string} mode
     */
    setMode(mode) {
        this._options.mode = mode;
        if (mode === 'none') {
            this.unselectAll();
        }
    }

    /**
     * Получение количества выбранных
     * @returns {number}
     */
    get count() {
        return this._selected.length;
    }

    /**
     * Очистка состояния
     */
    clear() {
        this._selected = [];
        this._lastSelected = null;
    }
}
