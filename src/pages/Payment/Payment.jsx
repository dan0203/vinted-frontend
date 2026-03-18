import './Payment.css';
import { Navigate, useLocation } from 'react-router';
import Cookies from 'js-cookie';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../../components/CheckoutForm/CheckoutForm';

const stripePromise = loadStripe('pk_test_51HCObyDVswqktOkX6VVcoA7V2sjOJCUB4FBt3EOiAdSz5vWudpWxwcSY8z2feWXBq6lwMgAb5IVZZ1p84ntLq03H00LDVc2RwP');

const Payment = () => {
    const location = useLocation();
    const { price, title, id } = location.state;

    const token = Cookies.get('token');

    const options = {
        // Type de transaction
        mode: 'payment',
        // Montant de la transaction
        amount: price * 100,
        // Devise de la transaction
        currency: 'eur',
        // On peut customiser l'apparence ici
        appearance: {
            /*...*/
        },
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
                        Il ne vous reste plus qu'une étape pour vous offrir {title}. Vous allez payer {(price + 0.4 + 0.8).toFixed(2)} € (frais de protection et frais de port inclus)
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
