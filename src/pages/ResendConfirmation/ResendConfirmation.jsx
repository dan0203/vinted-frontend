import './ResendConfirmation.css';
import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const ResendConfirmation = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    return (
        <main className="main-resend-confirmation">
            <div className="container">
                <h1>Renvoyer l'email de confirmation</h1>
                {submitted ? (
                    <p>
                        Si un compte existe pour cette adresse, un email de confirmation vient de
                        lui être envoyé.
                    </p>
                ) : (
                    <>
                        <ErrorMessage error={error} />
                        <form
                            onSubmit={async event => {
                                event.preventDefault();

                                try {
                                    await axios.post(
                                        import.meta.env.VITE_API_URL + '/users/confirm/resend',
                                        { email },
                                    );

                                    setError(null);
                                    setSubmitted(true);
                                } catch (error) {
                                    setError(error);
                                }
                            }}
                        >
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={email}
                                onChange={event => {
                                    setEmail(event.target.value);
                                }}
                            />
                            <button>Renvoyer l'email</button>
                        </form>
                        <Link to="/login">Retour à la connexion</Link>
                    </>
                )}
            </div>
        </main>
    );
};

export default ResendConfirmation;
