import './ErrorMessage.css';

const FALLBACK_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';

const ErrorMessage = ({ error }) => {
    if (!error) {
        return null;
    }

    const message = error?.response?.data?.message || (typeof error === 'string' && error) || FALLBACK_MESSAGE;

    return <p className="error-message">{message}</p>;
};

export default ErrorMessage;
