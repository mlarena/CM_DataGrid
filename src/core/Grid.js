import { EventEmitter } from '../utils/EventEmitter.js';
import { Column } from './Column.js';
import { DataSource } from './DataSource.js';

/**
 * CMDataGrid - Основной класс таблицы данных
 */
export class Grid extends EventEmitter {
    /**
     * @param {string|HTMLElement} selector - CSS селектор или DOM-элемент
     * @param {Object} config - Конфигурация таблицы
     */
    constructor(selector, config = {}) {
        super();

        this._container = this._resolveContainer(selector);
        if (!this._container) {
            throw new Error(`CMDataGrid: Элемент "${selector}" не найден`);
        }

        this._config = this._mergeDefaults(config);
        this._columns = this._initColumns(this._config.columns || []);
        this._dataSource = null;
        this._initialized = false;

        this._init();
    }

    /**
     * Конфигурация по умолчанию
     */
    _getDefaults() {
        return {
            dataSource: null,
            columns: [],
            selectable: { mode: 'none', checkbox: false },
            pageable: false,
            sortable: false,
            filterable: false,
            groupable: false,
            editable: false,
            resizable: false,
            reorderable: false,
            virtualScroll: { enabled: false },
            responsive: { enabled: false },
            state: { enabled: false },
            templates: {},
            messages: {},
            dataBound: null,
            change: null,
            sort: null,
            filter: null,
            pageChange: null
        };
    }

    /**
     * Слияние с дефолтами
     */
    _mergeDefaults(config) {
        const defaults = this._getDefaults();
        return { ...defaults, ...config };
    }

    /**
     * Разрешение контейнера
     */
    _resolveContainer(selector) {
        if (selector instanceof HTMLElement) return selector;
        if (typeof selector === 'string') {
            return document.querySelector(selector);
        }
        if (selector && selector[0]) {
            return selector[0];
        }
        return null;
    }

    /**
     * Инициализация колонок
     */
    _initColumns(columns) {
        return columns.map((col, index) => {
            const column = col instanceof Column ? col : new Column(col);
            column.index = index;
            return column;
        });
    }

    /**
     * Инициализация таблицы
     */
    _init() {
        this.trigger('beforeInit', { config: this._config });

        // Создание структуры DOM
        this._container.classList.add('cm-grid');
        this._container.innerHTML = this._getHTML();

        // Инициализация DataSource
        this._initDataSource();

        // Привязка событий
        this._bindEvents();

        this._initialized = true;
        this.trigger('afterInit', { grid: this });
    }

    /**
     * Базовая HTML-структура
     */
    _getHTML() {
        return `
            <div class="cm-grid-wrapper">
                <div class="cm-grid-header">
                    <table class="cm-grid-table cm-grid-header-table">
                        <thead>${this._renderHeader()}</thead>
                    </table>
                </div>
                <div class="cm-grid-content">
                    <table class="cm-grid-table cm-grid-body-table">
                        <tbody class="cm-grid-body"></tbody>
                    </table>
                </div>
                <div class="cm-grid-footer"></div>
            </div>
        `;
    }

    /**
     * Рендеринг заголовка
     */
    _renderHeader() {
        const columns = this._getVisibleColumns();
        const rows = [];

        // Проверяем наличие групп колонок
        const hasGroups = columns.some(col => col.isGroup);

        if (hasGroups) {
            // Рендерим группы
            rows.push(this._renderHeaderGroups(columns));
        }

        // Основная строка заголовков
        rows.push(this._renderHeaderRow(columns));

        return rows.join('');
    }

    /**
     * Рендеринг группы заголовков
     */
    _renderHeaderGroups(columns) {
        let html = '<tr>';
        columns.forEach(col => {
            if (col.isGroup) {
                const colspan = col.columns.length;
                html += `<th class="cm-grid-header-group" colspan="${colspan}">${col.title}</th>`;
            } else {
                html += '<th class="cm-grid-header-spacer"></th>';
            }
        });
        html += '</tr>';
        return html;
    }

    /**
     * Рендеринг строки заголовков
     */
    _renderHeaderRow(columns) {
        let html = '<tr>';
        columns.forEach(col => {
            if (col.isGroup) {
                // Для групп рендерим дочерние колонки
                col.columns.forEach(child => {
                    html += this._renderHeaderCell(child);
                });
            } else {
                html += this._renderHeaderCell(col);
            }
        });
        html += '</tr>';
        return html;
    }

    /**
     * Рендеринг ячейки заголовка
     */
    _renderHeaderCell(column) {
        const classes = ['cm-grid-header-cell'];
        if (column.get('sortable')) classes.push('cm-grid-sortable');
        if (column.get('filterable')) classes.push('cm-grid-filterable');

        const attrs = Object.entries(column.get('headerAttributes') || {})
            .map(([key, val]) => `${key}="${val}"`)
            .join(' ');

        return `
            <th class="${classes.join(' ')}" 
                data-field="${column.field}"
                ${attrs}>
                <span class="cm-grid-header-text">${column.title}</span>
                <span class="cm-grid-sort-icon"></span>
            </th>
        `;
    }

    /**
     * Рендеринг тела таблицы
     */
    _renderBody() {
        const tbody = this._container.querySelector('.cm-grid-body');
        if (!tbody) return;

        const data = this._dataSource ? this._dataSource.view() : [];
        const columns = this._getVisibleColumns();

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="cm-grid-empty">Нет данных</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        data.forEach((item, rowIndex) => {
            const tr = this._renderRow(item, columns, rowIndex);
            fragment.appendChild(tr);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }

    /**
     * Рендеринг строки
     */
    _renderRow(dataItem, columns, rowIndex) {
        const tr = document.createElement('tr');
        tr.classList.add('cm-grid-row');
        tr.dataset.rowIndex = rowIndex;

        if (this._isItemSelected(dataItem)) {
            tr.classList.add('cm-grid-row-selected');
        }

        columns.forEach(col => {
            if (col.isGroup) {
                col.columns.forEach(child => {
                    tr.appendChild(this._renderCell(dataItem, child, rowIndex));
                });
            } else {
                tr.appendChild(this._renderCell(dataItem, col, rowIndex));
            }
        });

        return tr;
    }

    /**
     * Рендеринг ячейки
     */
    _renderCell(dataItem, column, rowIndex) {
        const td = document.createElement('td');
        td.classList.add('cm-grid-cell');
        td.dataset.field = column.field;

        const value = column.getValue(dataItem);
        const rendered = column.render(value, dataItem);

        td.innerHTML = rendered;

        // Атрибуты ячейки
        const attrs = column.get('attributes') || {};
        Object.entries(attrs).forEach(([key, val]) => {
            td.setAttribute(key, val);
        });

        return td;
    }

    /**
     * Получение видимых колонок
     */
    _getVisibleColumns() {
        return this._columns.filter(col => col.visible);
    }

    /**
     * Инициализация DataSource
     */
    _initDataSource() {
        const dsConfig = this._config.dataSource || {};

        if (typeof dsConfig === 'object' && !Array.isArray(dsConfig)) {
            this._dataSource = new DataSource(dsConfig);
        } else if (Array.isArray(dsConfig)) {
            this._dataSource = new DataSource({ data: dsConfig });
        } else {
            this._dataSource = new DataSource();
        }

        // Привязка событий DataSource
        this._dataSource.on('pageChange', () => this.refresh());
        this._dataSource.on('sortChange', () => this.refresh());
        this._dataSource.on('filterChange', () => this.refresh());
        this._dataSource.on('groupChange', () => this.refresh());

        // Загрузка данных
        this._dataSource.read().then(() => {
            this.refresh();
            this.trigger('dataBound', { dataSource: this._dataSource, view: this._dataSource.view() });
        });
    }

    /**
     * Привязка событий
     */
    _bindEvents() {
        // Клик по заголовку для сортировки
        const headerRow = this._container.querySelector('.cm-grid-header-table');
        if (headerRow) {
            headerRow.addEventListener('click', (e) => {
                const headerCell = e.target.closest('.cm-grid-header-cell');
                if (headerCell && headerCell.classList.contains('cm-grid-sortable')) {
                    this._onHeaderClick(headerCell);
                }
            });
        }

        // Клик по строке
        const tbody = this._container.querySelector('.cm-grid-body');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const row = e.target.closest('.cm-grid-row');
                if (row) {
                    this._onRowClick(row, e);
                }
            });
        }
    }

    /**
     * Обработка клика по заголовку
     */
    _onHeaderClick(headerCell) {
        const field = headerCell.dataset.field;
        const column = this._columns.find(col => col.field === field);

        if (!column || !column.get('sortable')) return;

        const currentSort = this._dataSource.currentSort;
        const existing = currentSort.find(s => s.field === field);

        let newSort;
        if (existing) {
            if (existing.dir === 'asc') {
                newSort = currentSort.map(s => s.field === field ? { ...s, dir: 'desc' } : s);
            } else {
                // Удаляем сортировку
                newSort = currentSort.filter(s => s.field !== field);
            }
        } else {
            newSort = [...currentSort, { field, dir: 'asc' }];
        }

        this._dataSource.sort(newSort);
        this.trigger('sort', { sort: newSort });
    }

    /**
     * Обработка клика по строке
     */
    _onRowClick(row, event) {
        const rowIndex = parseInt(row.dataset.rowIndex);
        const data = this._dataSource.view()[rowIndex];

        this.trigger('rowClick', { row, dataItem: data, event });

        // Обработка выборки
        if (this._config.selectable.mode !== 'none') {
            this._toggleSelection(data, event);
        }
    }

    /**
     * Проверка選択状態
     */
    _isItemSelected(dataItem) {
        if (!this._selectedItems) return false;
        return this._selectedItems.includes(dataItem);
    }

    /**
     * Переключение選択
     */
    _toggleSelection(dataItem, event) {
        if (!this._selectedItems) {
            this._selectedItems = [];
        }

        const index = this._selectedItems.indexOf(dataItem);

        if (this._config.selectable.mode === 'single') {
            this._selectedItems = index === -1 ? [dataItem] : [];
        } else {
            if (index === -1) {
                this._selectedItems.push(dataItem);
            } else {
                this._selectedItems.splice(index, 1);
            }
        }

        this.refresh();
        this.trigger('change', { selectedItems: this._selectedItems });
    }

    // ===================== Публичные методы =====================

    /**
     * Обновление отображения
     */
    refresh() {
        this._renderBody();
    }

    /**
     * Перезагрузка данных
     */
    reload() {
        if (this._dataSource) {
            this._dataSource.read().then(() => this.refresh());
        }
    }

    /**
     * Установка DataSource
     * @param {Object|Array} dataSource
     */
    setDataSource(dataSource) {
        if (this._dataSource) {
            this._dataSource.destroy();
        }

        if (Array.isArray(dataSource)) {
            this._dataSource = new DataSource({ data: dataSource });
        } else {
            this._dataSource = new DataSource(dataSource);
        }

        this._dataSource.on('pageChange', () => this.refresh());
        this._dataSource.on('sortChange', () => this.refresh());
        this._dataSource.on('filterChange', () => this.refresh());

        this._dataSource.read().then(() => {
            this.refresh();
            this.trigger('dataBound', { dataSource: this._dataSource, view: this._dataSource.view() });
        });
    }

    /**
     * Получение DataSource
     * @returns {DataSource}
     */
    getDataSource() {
        return this._dataSource;
    }

    // ===================== Пагинация =====================

    goToPage(page) {
        if (this._dataSource) {
            this._dataSource.page(page);
            this.refresh();
            this.trigger('pageChange', { page, pageSize: this._dataSource.pageSize });
        }
    }

    nextPage() {
        if (this._dataSource) {
            this.goToPage(this._dataSource.currentPage + 1);
        }
    }

    prevPage() {
        if (this._dataSource) {
            this.goToPage(this._dataSource.currentPage - 1);
        }
    }

    firstPage() {
        this.goToPage(1);
    }

    lastPage() {
        if (this._dataSource) {
            this.goToPage(this._dataSource.totalPages);
        }
    }

    setPageSize(size) {
        if (this._dataSource) {
            this._dataSource.pageSize = size;
            this.refresh();
        }
    }

    // ===================== Сортировка =====================

    sort(field, direction = 'asc') {
        if (this._dataSource) {
            this._dataSource.sort([{ field, dir: direction }]);
            this.refresh();
        }
    }

    getSort() {
        return this._dataSource ? this._dataSource.currentSort : [];
    }

    clearSort() {
        if (this._dataSource) {
            this._dataSource.sort([]);
            this.refresh();
        }
    }

    // ===================== Фильтрация =====================

    filter(expression) {
        if (this._dataSource) {
            this._dataSource.filter(expression);
            this.refresh();
        }
    }

    getFilter() {
        return this._dataSource ? this._dataSource.currentFilter : null;
    }

    clearFilter() {
        if (this._dataSource) {
            this._dataSource.filter(null);
            this.refresh();
        }
    }

    // ===================== Выборка =====================

    select(row) {
        if (!this._selectedItems) this._selectedItems = [];
        if (!this._selectedItems.includes(row)) {
            this._selectedItems.push(row);
            this.refresh();
            this.trigger('change', { selectedItems: this._selectedItems });
        }
    }

    unselect(row) {
        if (!this._selectedItems) return;
        const index = this._selectedItems.indexOf(row);
        if (index !== -1) {
            this._selectedItems.splice(index, 1);
            this.refresh();
            this.trigger('change', { selectedItems: this._selectedItems });
        }
    }

    selectAll() {
        if (this._dataSource) {
            this._selectedItems = [...this._dataSource.view()];
            this.refresh();
            this.trigger('change', { selectedItems: this._selectedItems });
        }
    }

    unselectAll() {
        this._selectedItems = [];
        this.refresh();
        this.trigger('change', { selectedItems: [] });
    }

    getSelected() {
        return this._selectedItems || [];
    }

    // ===================== Колонки =====================

    showColumn(field) {
        const col = this._columns.find(c => c.field === field);
        if (col) {
            col.visible = true;
            this.refresh();
            this.trigger('columnShow', { column: col });
        }
    }

    hideColumn(field) {
        const col = this._columns.find(c => c.field === field);
        if (col) {
            col.visible = false;
            this.refresh();
            this.trigger('columnHide', { column: col });
        }
    }

    getColumns() {
        return [...this._columns];
    }

    // ===================== Утилиты =====================

    getDataItem(row) {
        if (this._dataSource) {
            return this._dataSource.view()[row] || null;
        }
        return null;
    }

    /**
     * Уничтожение таблицы
     */
    destroy() {
        if (this._dataSource) {
            this._dataSource.destroy();
        }

        this._container.classList.remove('cm-grid');
        this._container.innerHTML = '';

        super.destroy();
    }
}
