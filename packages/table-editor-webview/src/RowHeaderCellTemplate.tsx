import * as React from 'react';

// NOTE: all modules imported below may be imported from '@silevis/reactgrid'

import { getCellProperty, Cell, CellStyle, CellTemplate, Compatible, Span, Uncertain } from '@silevis/reactgrid';


export interface RowHeaderCell extends Cell, Span {
    type: 'rowHeader';
    text: string;
}

export class RowHeaderCellTemplate implements CellTemplate<RowHeaderCell> {

    getCompatibleCell(uncertainCell: Uncertain<RowHeaderCell>): Compatible<RowHeaderCell> {
        const text = getCellProperty(uncertainCell, 'text', 'string');
        const value = parseFloat(text);
        return { ...uncertainCell, text, value };
    }

    render(cell: Compatible<RowHeaderCell>, isInEditMode: boolean, onCellChanged: (cell: Compatible<RowHeaderCell>, commit: boolean) => void): React.ReactNode {
        return cell.text;
    }

    isFocusable = (cell: Compatible<RowHeaderCell>): boolean => true;

    getClassName(cell: Compatible<RowHeaderCell>, isInEditMode: boolean): string {
        return cell.className ? cell.className : '';
    }
}