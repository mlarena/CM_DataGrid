import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Filtering - Модуль фильтрации
 */
export class Filtering extends EventEmitter {
    /**
     * @param {Object} options - Конфигурация фильтрации
     */
    constructor(options = {}) {
        super();

        this._options = {
            mode: 'row', // 'row', 'menu', 'excel', 'custom'
            extra: false,
            applyButton: true,
            clearButton: true,
            operators: {
                string: {
                    eq: 'Равно',
                    neq: 'Не равно',
                    contains: 'Содержит',
                    doesnotcontain: 'Не содержит',
                    startswith: 'Начинается с',
                    endswith: 'Заканчивается'
                },
                number: {
                    eq: 'Равно',
                    neq: 'Не равно',
                    gt: 'Больше',
                    gte: 'Больше или равно',
                    lt: 'Меньше',
                    lte: 'Меньше или равно'
                },
                date: {
                    eq: 'Равно',
                    neq: 'Не равно',
                    gt: 'После',
                    gte: 'После или равно',
                    lt: 'До',
                    lte: 'До или равно'
                },
                boolean: {
                    eq: 'Равно'
                }
            },
            messages: {
                filter: 'Фильтр',
                clear: 'Очистить',
                apply: 'Применить',
                cancel: 'Отмена',
                and: 'И',
                or: 'ИЛИ',
                selectValue: 'Выберите значение',
                noData: 'Нет данных'
            },
            ...options
        };

        this._filters = {};
        this._container = null;
    }

    /**
     * Рендеринг строки фильтров
     * @param {HTMLElement} container
     * @param {Column[]} columns
     */
    render(container, columns) {
        this._container = container;

        if (this._options.mode === 'row') {
            container.innerHTML = this._renderFilterRow(columns);
            this._bindEvents(columns);
        }
    }

    /**
     * Рендеринг строки фильтров
     */
    _renderFilterRow(columns) {
        let html = '<tr class="cm-grid-filter-row">';

        columns.forEach(col => {
            if (col.isGroup) {
                col.columns.forEach(child => {
                    html += this._renderFilterCell(child);
                });
            } else {
                html += this._renderFilterCell(col);
            }
        });

        html += '</tr>';
        return html;
    }

    /**
     * Рендеринг ячейки фильтра
     */
    _renderFilterCell(column) {
        const field = column.field;
        const currentFilter = this._filters[field];
        const value = currentFilter ? currentFilter.value : '';

        return `
            <td class="cm-grid-filter-cell" data-field="${field}">
                <input type="text" 
                       class="cm-grid-filter-input" 
                       data-field="${field}"
                       value="${this._escapeHtml(value)}"
                       placeholder="${column.title}">
            </td>
        `;
    }

    /**
     * Экранирование HTML
     */
    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Привязка событий
     */
    _bindEvents(columns) {
        if (!this._container) return;

        const inputs = this._container.querySelectorAll('.cm-grid-filter-input');

        inputs.forEach(input => {
            // Поиск при вводе (с задержкой)
            let timeout;
            input.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this._applyFilter(e.target.dataset.field, e.target.value);
                }, 300);
            });

            // Поиск при Enter
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this._applyFilter(e.target.dataset.field, e.target.value);
                }
            });
        });
    }

    /**
     * Применение фильтра
     */
    _applyFilter(field, value) {
        if (value === '' || value === null || value === undefined) {
            delete this._filters[field];
        } else {
            this._filters[field] = {
                field,
                operator: 'contains',
                value
            };
        }

        this.trigger('filterChange', { filters: this.getFilters() });
    }

    /**
     * Установка фильтра
     * @param {string} field
     * @param {string} operator
     * @param {*} value
     */
    setFilter(field, operator, value) {
        if (value === '' || value === null || value === undefined) {
            delete this._filters[field];
        } else {
            this._filters[field] = { field, operator, value };
        }

        this.trigger('filterChange', { filters: this.getFilters() });
    }

    /**
     * Получение фильтра для поля
     * @param {string} field
     * @returns {Object|null}
     */
    getFilter(field) {
        return this._filters[field] || null;
    }

    /**
     * Получение всех фильтров
     * @returns {Object}
     */
    getFilters() {
        return { ...this._filters };
    }

    /**
     * Получение Expression для DataSource
     * @returns {Object|null}
     */
    getFilterExpression() {
        const filters = Object.values(this._filters);

        if (filters.length === 0) return null;

        if (filters.length === 1) {
            return filters[0];
        }

        return {
            logic: 'and',
            filters
        };
    }

    /**
     * Очистка фильтра для поля
     * @param {string} field
     */
    clearFilter(field) {
        if (field) {
            delete this._filters[field];
        } else {
            this._filters = {};
        }

        this._updateInputs();
        this.trigger('filterChange', { filters: this.getFilters() });
    }

    /**
     * Очистка всех фильтров
     */
    clearAll() {
        this._filters = {};
        this._updateInputs();
        this.trigger('filterChange', { filters: {} });
    }

    /**
     * Обновление значений инпутов
     */
    _updateInputs() {
        if (!this._container) return;

        this._container.querySelectorAll('.cm-grid-filter-input').forEach(input => {
            const field = input.dataset.field;
            const filter = this._filters[field];
            input.value = filter ? filter.value : '';
        });
    }

    /**
     * Применение фильтра к данным
     * @param {Array} data
     * @returns {Array}
     */
    applyFilter(data) {
        const filters = Object.values(this._filters);

        if (filters.length === 0) return data;

        return data.filter(item => {
            return filters.every(filter => this._evaluateFilter(item, filter));
        });
    }

    /**
     * Оценка условия фильтра
     */
    _evaluateFilter(item, filter) {
        const value = this._getValue(item, filter.field);
        const filterValue = filter.value;

        if (filterValue === '' || filterValue === null || filterValue === undefined) {
            return true;
        }

        switch (filter.operator) {
            case 'eq':
                return value === filterValue || String(value) === String(filterValue);
            case 'neq':
                return value !== filterValue && String(value) !== String(filterValue);
            case 'contains':
                return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'doesnotcontain':
                return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'startswith':
                return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endswith':
                return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
            case 'gt':
                return value > filterValue;
            case 'gte':
                return value >= filterValue;
            case 'lt':
                return value < filterValue;
            case 'lte':
                return value <= filterValue;
            default:
                return true;
        }
    }

    /**
     * Получение значения по пути
     */
    _getValue(obj, path) {
        if (!path) return obj;
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    /**
     * Проверка, есть ли активные фильтры
     * @returns {boolean}
     */
    hasFilters() {
        return Object.keys(this._filters).length > 0;
    }

    /**
     * Получение количества активных фильтров
     * @returns {number}
     */
    get filterCount() {
        return Object.keys(this._filters).length;
    }
}
