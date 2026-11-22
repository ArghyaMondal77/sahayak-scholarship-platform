import { parseStudentQuery } from '../../src/utils/queryParser.js';
const input = 'B.Tech student from Pune with family income under 3 lakh';
const result = parseStudentQuery(input);
console.log('input:', JSON.stringify(input));
console.log('result:', JSON.stringify(result));
console.log('isUnmarried:', result.isUnmarried, 'typeof:', typeof result.isUnmarried);
console.log('BUG_REPRODUCED:', result.isUnmarried === true);
