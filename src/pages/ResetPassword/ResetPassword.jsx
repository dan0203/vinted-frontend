import './ResetPassword.css';
import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const ResetPassword = () => {
    const [step, setStep] = useState('request');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [passwordMismatch, setPasswordMismatch] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <main className="main-reset-password">
            <div className="container">
                <h1>Mot de passe oublié</h1>
                {step === 'request' && (
                    <>
                        <ErrorMessage error={error} />
                        <form
                            onSubmit={async event => {
                                event.preventDefault();

                                setIsSubmitting(true);
                                try {
                                    await axios.post(
                                        import.meta.env.VITE_API_URL + '/users/reset/request',
                                        { email },
                                    );

                                    setError(null);
                                    setStep('confirm');
                                } catch (error) {
                                    setError(error);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                        >
                            <p>
                                Indiquez votre email, nous vous enverrons un code pour
                                réinitialiser votre mot de passe.
                            </p>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={email}
                                onChange={event => {
                                    setEmail(event.target.value);
                                }}
                            />
                            <button disabled={isSubmitting}>Recevoir le code</button>
                        </form>
                        <Link to="/login">Retour à la connexion</Link>
                    </>
                )}
                {step === 'confirm' && (
                    <>
                        <ErrorMessage error={error} />
                        {passwordMismatch && (
                            <p className="field-error">
                                Les mots de passe ne correspondent pas.
                            </p>
                        )}
                        <form
                            onSubmit={async event => {
                                event.preventDefault();

                                setError(null);
                                setPasswordMismatch(false);

                                if (password !== confirmPassword) {
                                    setPasswordMismatch(true);
                                    return;
                                }

                                setIsSubmitting(true);
                                try {
                                    await axios.post(
                                        import.meta.env.VITE_API_URL + '/users/reset/confirm',
                                        { token, password },
                                    );

                                    setStep('done');
                                } catch (error) {
                                    setError(error);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                        >
                            <p>
                                Si un compte existe pour cette adresse, un code vient de lui être
                                envoyé. Saisissez-le ci-dessous avec votre nouveau mot de passe.
                            </p>
                            <input
                                type="text"
                                name="token"
                                placeholder="Code"
                                value={token}
                                onChange={event => {
                                    setToken(event.target.value);
                                }}
                            />
                            <input
                                type="password"
                                name="password"
                                placeholder="Nouveau mot de passe"
                                value={password}
                                onChange={event => {
                                    setPassword(event.target.value);
                                    setPasswordMismatch(false);
                                }}
                            />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirmer le mot de passe"
                                value={confirmPassword}
                                onChange={event => {
                                    setConfirmPassword(event.target.value);
                                    setPasswordMismatch(false);
                                }}
                            />
                            <button disabled={isSubmitting}>Réinitialiser le mot de passe</button>
                        </form>
                        <Link to="/login">Retour à la connexion</Link>
                    </>
                )}
                {step === 'done' && (
                    <>
                        <p>
                            Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous
                            connecter.
                        </p>
                        <Link to="/login">Se connecter</Link>
                    </>
                )}
            </div>
        </main>
    );
};

export default ResetPassword;
