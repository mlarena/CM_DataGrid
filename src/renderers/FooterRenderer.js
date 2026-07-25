/**
 * FooterRenderer - Рендеринг подвала таблицы
 */
export class FooterRenderer {
    /**
     * @param {Object} options - Опции рендерера
     */
    constructor(options = {}) {
        this._options = {
            showInfo: true,
            ...options
        };
    }

    /**
     * Рендеринг подвала
     * @param {Column[]} columns - Колонки
     * @param {Object} aggregates - Значения агрегатов
     * @returns {string}
     */
    render(columns, aggregates = {}) {
        if (!aggregates || Object.keys(aggregates).length === 0) {
            return '';
        }

        let html = '<tr class="cm-grid-footer-row">';

        columns.forEach(col => {
            if (col.isGroup) {
                col.columns.forEach(child => {
                    html += this._renderCell(child, aggregates);
                });
            } else {
                html += this._renderCell(col, aggregates);
            }
        });

        html += '</tr>';
        return html;
    }

    /**
     * Рендеринг ячейки футера
     * @param {Column} column - Колонка
     * @param {Object} aggregates - Значения агрегатов
     * @returns {string}
     */
    _renderCell(column, aggregates) {
        const classes = ['cm-grid-footer-cell'];
        const field = column.field;
        const value = aggregates[field];

        // Проверяем, есть ли шаблон футера
        const footerTemplate = column.get('footerTemplate');
        let content = '';

        if (footerTemplate) {
            content = footerTemplate({ value, aggregates, field });
        } else if (value !== undefined && value !== null) {
            content = this._formatValue(value, column);
        }

        return `<td class="${classes.join(' ')}" data-field="${field}">${content}</td>`;
    }

    /**
     * Форматирование значения
     * @param {*} value
     * @param {Column} column
     * @returns {string}
     */
    _formatValue(value, column) {
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return String(value);
    }

    /**
     * Рендеринг информационной строки (Записи X-Y из Z)
     * @param {number} start - Начальный индекс
     * @param {number} end - Конечный индекс
     * @param {number} total - Общее количество
     * @returns {string}
     */
    renderInfo(start, end, total) {
        if (!this._options.showInfo) return '';

        if (total === 0) {
            return '<span class="cm-grid-pager-info">Нет записей</span>';
        }

        return `<span class="cm-grid-pager-info">Записи ${start}-${end} из ${total}</span>`;
    }
}
