// Calculator Plugin | Version 1.1.0

const userConfig = {};
const DEFAULT_DECIMALS = 3;

module.exports = (api) => {
    api.metadata({
        name: 'calc',
        displayName: 'Calculator',
        version: '1.1.0',
        author: 'kevquit',
        description: 'Number Calculator. Usage: /calc <expression>',
    });

    api.intercept('packet:client:chat', (event) => {
        const msg = event.data?.message;
        if (!msg?.startsWith('/')) return;

        const raw = msg.slice(1);
        const lower = raw.toLowerCase();
        if (!lower.startsWith('calc')) return;

        event.cancel();

        const args = raw.slice(4).trim();
        const playerName = event.data?.username || 'Unknown';

        if (!args || lower === 'calc' || lower === 'calc help' || lower === 'calc config') {
            return help(api);
        }

        if (lower.startsWith('calc decimals')) {
            const value = parseInt(args.slice(8).trim(), 10);
            if (isNaN(value) || value < 1 || value > 10) {
                api.chat('§8[§6S§eta§fr§bfi§3sh§8-§6CALC§8] §cDecimal range: 1-10');
                return;
            }
            if (!userConfig[playerName]) userConfig[playerName] = {};
            userConfig[playerName].decimals = value;
            api.chat(`§8[§6S§eta§fr§bfi§3sh§8-§6CALC§8] §7Decimals set to: §a${value}`);
            return;
        }

        try {
            const decimals = (userConfig[playerName] || {}).decimals || DEFAULT_DECIMALS;
            const { value, formatted } = evaluate(args.replace(/x/gi, '*'), decimals);
            api.chat(`§8[§6S§eta§fr§bfi§3sh§8-§6CALC§8] » §f${args} §8= §a${formatted}`);
        } catch (err) {
            api.chat('§8[§6S§eta§fr§bfi§3sh§8-§6CALC§8] §cInvalid expression.');
        }
    });
};

function help(api) {
    api.chat('§8----------------------------');
    api.chat('§6Calculator Commands');
    api.chat('§e/calc §7<expression>');
    api.chat('§e/calc decimals §7<1-10>');
    api.chat('§7Operators: §f+, -, x, /, ^');
    api.chat('§8Example: §f/calc 4 + 4 x 2');
    api.chat('§8----------------------------');
}

// Everything beyond this point is AI generated - kevquit
// ---- Math Engine (Condensed Shunting Yard) ----

function evaluate(expr, decimals = DEFAULT_DECIMALS) {
    if (typeof expr !== 'string') throw new Error('Expression must be a string');
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '');

    const MAX_DECIMALS = Math.max(1, Math.min(10, decimals || DEFAULT_DECIMALS));
    const rawTokens = expr.match(/(\*\*|\d+\.\d+|\.\d+|\d+|[()+\-*/^])/g);
    if (!rawTokens) throw new Error('Missing expression');

    const tokens = [];
    for (let i = 0; i < rawTokens.length; i++) {
        const t = rawTokens[i];
        if (t === '-' && (i === 0 || /[+\-*/^(]/.test(rawTokens[i - 1]))) {
            const next = rawTokens[i + 1];
            if (next && /^(?:\d+\.\d+|\.\d+|\d+)$/.test(next)) {
                tokens.push('-' + next);
                i++;
                continue;
            }
            if (next === '(') {
                tokens.push('0');
                tokens.push('-');
                continue;
            }
        }
        if (t === '**') tokens.push('^'); else tokens.push(t);
    }

    const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
    const assoc = { '+': 'left', '-': 'left', '*': 'left', '/': 'left', '^': 'right' };

    const out = [];
    const ops = [];
    for (const t of tokens) {
        if (/^-?\d+(?:\.\d+)?$/.test(t) || /^\.\d+$/.test(t)) {
            out.push(t);
        } else if (t in prec) {
            while (ops.length && ops[ops.length - 1] !== '(') {
                const top = ops[ops.length - 1];
                if (!(top in prec)) break;
                if (prec[top] > prec[t] || (prec[top] === prec[t] && assoc[t] === 'left')) out.push(ops.pop());
                else break;
            }
            ops.push(t);
        } else if (t === '(') ops.push(t);
        else if (t === ')') {
            while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
            if (!ops.length || ops[ops.length - 1] !== '(') throw new Error('Mismatched parentheses');
            ops.pop();
        } else {
            throw new Error('Invalid token');
        }
    }
    while (ops.length) {
        const op = ops.pop();
        if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
        out.push(op);
    }

    const stack = [];
    for (const t of out) {
        if (/^-?\d+(?:\.\d+)?$/.test(t) || /^\.\d+$/.test(t)) stack.push(parseFloat(t));
        else {
            const b = stack.pop();
            const a = stack.pop();
            if (a === undefined || b === undefined) throw new Error('Invalid expression');
            let res;
            if (t === '+') res = a + b;
            else if (t === '-') res = a - b;
            else if (t === '*') res = a * b;
            else if (t === '/') {
                if (b === 0) throw new Error('Division by zero');
                res = a / b;
            } else if (t === '^') {
                res = Math.pow(a, b);
                if (!Number.isFinite(res) || Number.isNaN(res)) {
                    const rounded = Math.round(b);
                    if (Math.abs(b - rounded) < 1e-12) {
                        res = Math.pow(a, rounded);
                    }
                }
                if (!Number.isFinite(res) || Number.isNaN(res)) throw new Error('Invalid power operation');
            }
            else throw new Error('Unsupported operator');
            if (!Number.isFinite(res)) throw new Error('Invalid result');
            stack.push(res);
        }
    }
    if (stack.length !== 1) throw new Error('Invalid expression');
    const value = stack[0];

    function formatNumber(n) {
        if (!Number.isFinite(n)) return String(n);
        const neg = n < 0; n = Math.abs(n);
        if (Number.isInteger(n)) return (neg ? '-' : '') + Number(n).toLocaleString();
        let s = n.toFixed(MAX_DECIMALS);
        s = s.replace(/\.?(0+)$/, '');
        const parts = s.split('.');
        const intPart = Number(parts[0]).toLocaleString();
        return (neg ? '-' : '') + intPart + (parts[1] ? '.' + parts[1] : '');
    }

    return { value, formatted: formatNumber(value) };
}
