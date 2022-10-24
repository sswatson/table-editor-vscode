
import dayjs from 'dayjs';
import _ from 'lodash-es';

function functionFromString(code: string, preamble = '') {
  return new Function(`'use strict';${preamble};return ${code};`)();
}

export function functionWithUtilsFromString(
  argNames: string[], code: string, preamble = ''
) {
  return (...args: any[]) => functionFromString(
    `(dayjs, _, ${argNames.join(", ")}) => ${code}`,
    preamble
  )(dayjs, _, ...args);
}