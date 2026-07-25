/**
 * CM Data Grid - Универсальный компонент таблицы данных
 * @version 1.0.0
 */

import { Grid } from './core/Grid.js';
import { Column } from './core/Column.js';
import { DataSource } from './core/DataSource.js';
import { EventEmitter } from './utils/EventEmitter.js';
import { Paging } from './modules/Paging.js';
import { Sorting } from './modules/Sorting.js';
import { Selection } from './modules/Selection.js';
import { Filtering } from './modules/Filtering.js';

// Экспорт для ES-модулей
export {
    Grid,
    Column,
    DataSource,
    EventEmitter,
    Paging,
    Sorting,
    Selection,
    Filtering
};

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.CMDataGrid = Grid;
    window.CMDataGridColumn = Column;
    window.CMDataGridDataSource = DataSource;
}
