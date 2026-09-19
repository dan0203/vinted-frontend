import axios from 'axios';

let currentToken = null;
const listeners = new Set();

export const getToken = () => currentToken;

export const setToken = token => {
    currentToken = token;
    listeners.forEach(listener => listener(token));
};

export const subscribeToken = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Read from the token rather than kept from the login response, which is the
// only place the API ever sends the user id: `/users/refresh` returns a bare
// accessToken, so an id stored at login would go stale on the first silent
// refresh. The signature is not checked, which is fine because this only
// addresses requests the backend authorizes on its own (403 on someone else's
// id), never to decide what the user is allowed to do.
export const getUserId = () => {
    if (!currentToken) {
        return null;
    }

    try {
        const payload = currentToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload)).sub ?? null;
    } catch {
        return null;
    }
};

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

client.interceptors.request.use(config => {
    if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
});

// One bounded refresh, shared by the interceptor below and the page-load
// bootstrap. Bare `axios`, never `client`: sending it through the interceptor
// would answer its own 401 with a second refresh and then push the visitor to
// /login. Bounded because axios has no default timeout, and an unbounded
// refresh leaves whatever waits on it pending for good: the first render for
// the bootstrap, the retried request for the interceptor (findings F-01, F-05).
const requestRefresh = () =>
    axios.post(
        `${import.meta.env.VITE_API_URL}/users/refresh`,
        {},
        { withCredentials: true, timeout: 5000 },
    );

client.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
            throw error;
        }
        originalRequest._retried = true;

        try {
            const refreshResponse = await requestRefresh();
            const newToken = refreshResponse.data.accessToken;
            setToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
        } catch {
            setToken(null);
            if (!originalRequest.skipAuthRedirect) {
                window.location.assign('/login');
            }
            throw error;
        }
    },
);

// The page-load bootstrap. A failure here is never a redirect: anonymous
// browsing is the app's default state, unlike the interceptor's refresh, which
// fails a request the user already asked for.
export const restoreSession = async () => {
    try {
        const response = await requestRefresh();
        setToken(response.data.accessToken);
    } catch {
        // No cookie, expired, rotated away, too slow, or the API is unreachable:
        // browsing anonymously is the app's normal state, not an error to report.
    }
};

export default client;
