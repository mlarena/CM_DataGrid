import { EventEmitter } from '../utils/EventEmitter.js';
import { Column } from './Column.js';
import { DataSource } from './DataSource.js';
import { Paging } from '../modules/Paging.js';
import { Sorting } from '../modules/Sorting.js';
import { Selection } from '../modules/Selection.js';
import { Filtering } from '../modules/Filtering.js';
import { HeaderRenderer } from '../renderers/HeaderRenderer.js';
import { CellRenderer } from '../renderers/CellRenderer.js';
import { FooterRenderer } from '../renderers/FooterRenderer.js';

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

        // Модули
        this._paging = null;
        this._sorting = null;
        this._selection = null;
        this._filtering = null;

        // Рендереры
        this._headerRenderer = null;
        this._cellRenderer = null;
        this._footerRenderer = null;

        this._init();
    }

    /**
     * Конфигурация по умолчанию
     */
    _getDefaults() {
        return {
            dataSource: null,
            columns: [],
            selectable: { mode: 'none', checkbox: false, persist: false },
            pageable: { enabled: false, pageSize: 20, pageSizes: [10, 20, 50, 100] },
            sortable: { enabled: false, mode: 'single', allowUnsort: true },
            filterable: { enabled: false, mode: 'row' },
            groupable: { enabled: false },
            editable: { enabled: false, mode: 'inline' },
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

        // Инициализация рендереров
        this._initRenderers();

        // Инициализация модулей
        this._initModules();

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
     * Инициализация рендереров
     */
    _initRenderers() {
        this._headerRenderer = new HeaderRenderer({
            sortable: this._config.sortable?.enabled || false,
            filterable: this._config.filterable?.enabled || false
        });

        this._cellRenderer = new CellRenderer();

        this._footerRenderer = new FooterRenderer();
    }

    /**
     * Инициализация модулей
     */
    _initModules() {
        // Пагинация
        if (this._config.pageable?.enabled) {
            this._paging = new Paging(this._config.pageable);
            this._paging.on('pageChange', (e, data) => {
                this._dataSource.page(data.page);
                this.refresh();
                this.trigger('pageChange', data);
            });
            this._paging.on('pageSizeChange', (e, data) => {
                this._dataSource.pageSize = data.pageSize;
                this.refresh();
            });
        }

        // Сортировка
        this._sorting = new Sorting({
            mode: this._config.sortable?.mode || 'single',
            allowUnsort: this._config.sortable?.allowUnsort !== false,
            initial: this._config.sort || []
        });

        this._sorting.on('sortChange', (e, data) => {
            this._dataSource.sort(data.sort);
            this._renderHeader();
            this.refresh();
            this.trigger('sort', { sort: data.sort });
        });

        // Выборка
        this._selection = new Selection(this._config.selectable);
        this._selection.on('selectionChange', (e, data) => {
            this.refresh();
            this.trigger('change', { selectedItems: data.selected });
        });

        // Фильтрация
        if (this._config.filterable?.enabled) {
            this._filtering = new Filtering(this._config.filterable);
            this._filtering.on('filterChange', (e, data) => {
                const filterExpr = this._filtering.getFilterExpression();
                this._dataSource.filter(filterExpr);
                this.refresh();
                this.trigger('filter', { filter: filterExpr });
            });
        }
    }

    /**
     * Базовая HTML-структура
     */
    _getHTML() {
        const filterRow = this._config.filterable?.enabled ? '<tbody class="cm-grid-filter-tbody"></tbody>' : '';

        return `
            <div class="cm-grid-wrapper">
                <div class="cm-grid-header">
                    <table class="cm-grid-table cm-grid-header-table">
                        <thead>${this._renderHeader()}</thead>
                        ${filterRow}
                    </table>
                </div>
                <div class="cm-grid-content">
                    <table class="cm-grid-table cm-grid-body-table">
                        <tbody class="cm-grid-body"></tbody>
                    </table>
                </div>
                <div class="cm-grid-footer-container"></div>
                <div class="cm-grid-pager-container"></div>
            </div>
        `;
    }

    /**
     * Рендеринг заголовка
     */
    _renderHeader() {
        const columns = this._getVisibleColumns();
        const sort = this._sorting ? this._sorting.getSort() : [];

        return this._headerRenderer.render(columns, sort);
    }

    /**
     * Обновление заголовка
     */
    _updateHeader() {
        const thead = this._container.querySelector('.cm-grid-header-table thead');
        if (thead) {
            thead.innerHTML = this._renderHeader();
        }

        // Обновляем индикаторы сортировки
        if (this._sorting) {
            const columns = this._getVisibleColumns();
            const sort = this._sorting.getSort();

            columns.forEach(col => {
                if (col.isGroup) {
                    col.columns.forEach(child => {
                        const th = this._container.querySelector(`th[data-field="${child.field}"]`);
                        if (th) this._sorting.renderIndicator(th, child.field);
                    });
                } else {
                    const th = this._container.querySelector(`th[data-field="${col.field}"]`);
                    if (th) this._sorting.renderIndicator(th, col.field);
                }
            });
        }
    }

    /**
     * Рендеринг строки фильтров
     */
    _renderFilterRow() {
        if (!this._filtering) return;

        const filterTbody = this._container.querySelector('.cm-grid-filter-tbody');
        if (filterTbody) {
            this._filtering.render(filterTbody, this._getVisibleColumns());
        }
    }

    /**
     * Рендеринг пагинации
     */
    _renderPager() {
        if (!this._paging) return;

        const pagerContainer = this._container.querySelector('.cm-grid-pager-container');
        if (pagerContainer) {
            this._paging.render(pagerContainer, {
                page: this._dataSource.currentPage,
                total: this._dataSource.total(),
                pageSize: this._dataSource.pageSize
            });
        }
    }

    /**
     * Рендеринг футера
     */
    _renderFooter() {
        const footerContainer = this._container.querySelector('.cm-grid-footer-container');
        if (!footerContainer) return;

        // Здесь можно добавить отображение агрегатов
        footerContainer.innerHTML = '';
    }

    /**
     * Рендеринг тела таблицы
     */
    _renderBody() {
        const tbody = this._container.querySelector('.cm-grid-body');
        if (!tbody) return;

        const data = this._dataSource ? this._dataSource.view() : [];
        const columns = this._getVisibleColumns();
        const selected = this._selection ? this._selection.getSelected() : [];

        if (data.length === 0) {
            tbody.innerHTML = this._cellRenderer.renderEmpty(columns.length);
            return;
        }

        const fragment = document.createDocumentFragment();
        data.forEach((item, rowIndex) => {
            const tr = this._cellRenderer.renderRow(item, columns, rowIndex, { selected });
            fragment.appendChild(tr);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);

        // Обновляем пагинацию
        this._renderPager();

        // Обновляем футер
        this._renderFooter();
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
        const headerTable = this._container.querySelector('.cm-grid-header-table');
        if (headerTable) {
            headerTable.addEventListener('click', (e) => {
                const headerCell = e.target.closest('.cm-grid-header-cell');
                if (headerCell && headerCell.classList.contains('cm-grid-sortable')) {
                    this._onHeaderClick(headerCell, e);
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
    _onHeaderClick(headerCell, event) {
        const field = headerCell.dataset.field;
        const column = this._columns.find(col => col.field === field);

        if (!column || !column.get('sortable')) return;

        if (this._sorting) {
            const isCtrl = event.ctrlKey || event.metaKey;
            this._sorting.handleHeaderClick(field, isCtrl);
        }
    }

    /**
     * Обработка клика по строке
     */
    _onRowClick(row, event) {
        const rowIndex = parseInt(row.dataset.rowIndex);
        const data = this._dataSource.view()[rowIndex];

        this.trigger('rowClick', { row, dataItem: data, event });

        // Обработка выборки
        if (this._selection && this._config.selectable?.mode !== 'none') {
            this._selection.handleRowClick(data, event);
        }
    }

    // ===================== Публичные методы =====================

    /**
     * Обновление отображения
     */
    refresh() {
        this._renderBody();
        this._updateHeader();
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
        if (this._selection) {
            this._selection.select(row);
        }
    }

    unselect(row) {
        if (this._selection) {
            this._selection.unselect(row);
        }
    }

    selectAll() {
        if (this._selection && this._dataSource) {
            this._selection.selectAll(this._dataSource.view());
        }
    }

    unselectAll() {
        if (this._selection) {
            this._selection.unselectAll();
        }
    }

    getSelected() {
        return this._selection ? this._selection.getSelected() : [];
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
        // Уничтожаем модули
        if (this._paging) this._paging.destroy();
        if (this._sorting) this._sorting.destroy();
        if (this._selection) this._selection.destroy();
        if (this._filtering) this._filtering.destroy();

        // Уничтожаем DataSource
        if (this._dataSource) {
            this._dataSource.destroy();
        }

        this._container.classList.remove('cm-grid');
        this._container.innerHTML = '';

        super.destroy();
    }
}
