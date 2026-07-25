/**
 * CM Data Grid - Универсальный компонент таблицы данных
 * @version 1.0.0
 */

import { Grid } from './core/Grid.js';
import { Column } from './core/Column.js';
import { DataSource } from './core/DataSource.js';
import { EventEmitter } from './utils/EventEmitter.js';

// Экспорт для ES-модулей
export { Grid, Column, DataSource, EventEmitter };

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.CMDataGrid = Grid;
    window.CMDataGridColumn = Column;
    window.CMDataGridDataSource = DataSource;
}
