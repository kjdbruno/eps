// What a caller is told when the SERVER fails.
//
// Many handlers answer a failure with `{ error: error.message }`, which in production would hand a visitor database messages, table
// and column names and file paths. In production every 5xx answer is replaced by one plain sentence (the real error is logged here
// instead); anywhere else the answer is left as it is, so a developer still sees what went wrong.
const isProd = process.env.NODE_ENV === 'production';
const GENERIC = 'Something went wrong on the server. Please try again.';

// wraps res.json: a 5xx body is swapped for the generic one in production
const maskServerErrors = (req, res, next) => {
    if (!isProd) return next();
    const json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 500) {
            console.error(`[${res.statusCode}] ${req.method} ${req.originalUrl}`, body && (body.error || body.message) ? body.error || body.message : body);
            return json({ message: GENERIC });
        }
        return json(body);
    };
    next();
};

// the last stop: a body that is too big or not valid JSON, and anything that was thrown and not caught
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return res.status(413).json({ message: 'That is too large to send.' });
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: 'That request could not be read.' });
    if (err && (err.code === 'LIMIT_FILE_SIZE')) return res.status(413).json({ message: 'That file is too large.' });
    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    return res.status(err && err.status && err.status < 500 ? err.status : 500).json({ message: isProd ? GENERIC : (err && err.message) || GENERIC });
};

const notFound = (req, res) => res.status(404).json({ message: 'Not found.' });

module.exports = { maskServerErrors, errorHandler, notFound };
