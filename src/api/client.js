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

client.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retried) {
            throw error;
        }
        originalRequest._retried = true;

        try {
            const refreshResponse = await axios.post(
                `${import.meta.env.VITE_API_URL}/users/refresh`,
                {},
                { withCredentials: true },
            );
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

export default client;
