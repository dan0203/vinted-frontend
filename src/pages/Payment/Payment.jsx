import './Payment.css';
import { Navigate, useLocation } from 'react-router';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../components/CheckoutForm/CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Payment = ({ token }) => {
    const location = useLocation();
    const { price, title, id } = location.state;

    const options = {
        // Type de transaction
        mode: 'payment',
        // Montant de la transaction
        amount: price * 100,
        // Devise de la transaction
        currency: 'eur',
        // On peut customiser l'apparence ici
        appearance: {/*...*/},
    };

    return token ? (
        <main className="main-payment">
            <div className="container">
                <section>
                    <h1>Résumé de la commande</h1>
                    <div>
                        <p>Commande</p> <p>{price.toFixed(2)} €</p>
                    </div>
                    <div>
                        <p>Frais de protection acheteur</p> <p>{(0.4).toFixed(2)} €</p>
                    </div>
                    <div>
                        <p>Frais de port</p> <p>{(0.8).toFixed(2)} €</p>
                    </div>
                </section>

                <section>
                    <div>
                        <p>Total</p> <p>{(price + 0.4 + 0.8).toFixed(2)} €</p>
                    </div>
                    <p>
                        Il ne vous reste plus qu'une étape pour vous offrir {title}. Vous allez
                        payer {(price + 0.4 + 0.8).toFixed(2)} € (frais de protection et frais de
                        port inclus)
                    </p>
                </section>

                <section>
                    <Elements stripe={stripePromise} options={options}>
                        <CheckoutForm title={title} price={price} />
                    </Elements>
                </section>
            </div>
        </main>
    ) : (
        <Navigate to="/login" state={{ from: '/offers/' + id }} />
    );
};

export default Payment;
