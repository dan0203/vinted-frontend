import './Offer.css';
import { Link, useParams } from 'react-router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const DETAIL_LABELS = {
    brand: 'Marque',
    size: 'Taille',
    color: 'Couleur',
    condition: 'État',
    city: 'Emplacement',
};

const STATUS_LABELS = {
    reserved: 'Réservé',
    sold: 'Vendu',
};

const Offer = () => {
    const params = useParams();
    const [offer, setOffer] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(
                    import.meta.env.VITE_API_URL + '/offers/' + params.id,
                );

                setOffer(response.data);
                setError(null);
            } catch (error) {
                setError(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

    return isLoading ? (
        <p className="loading">Chargement en cours...</p>
    ) : error ? (
        <main className="main-offer">
            <div className="container">
                <ErrorMessage error={error} />
            </div>
        </main>
    ) : (
        <>
            <main className="main-offer">
                <div className="container">
                    {offer.image && <img src={offer.image.url} alt={offer.name} />}
                    <aside>
                        <p className="product_price">
                            {offer.price} €
                            {offer.status && offer.status !== 'available' && (
                                <span className="offer-status-badge">
                                    {STATUS_LABELS[offer.status] ?? offer.status}
                                </span>
                            )}
                        </p>
                        <div className="product_details_wrapper">
                            {Object.entries(offer.details ?? {}).map(([key, value]) => (
                                <div key={key} className="product_details">
                                    <p className="product_details_key">
                                        {DETAIL_LABELS[key] ?? key}
                                    </p>
                                    <p className="product_details_value">{value}</p>
                                </div>
                            ))}
                        </div>
                        <p className="product_name">{offer.name}</p>
                        <p className="product_description">{offer.description}</p>
                        <p className="user-info">
                            {offer.owner.account.avatar && (
                                <img
                                    src={offer.owner.account.avatar.url}
                                    alt={offer.owner.account.username}
                                />
                            )}
                            <span>{offer.owner.account.username}</span>
                        </p>

                        <h1>{offer.name}</h1>

                        {!offer.status || offer.status === 'available' ? (
                            <Link
                                to="/payment"
                                state={{
                                    title: offer.name,
                                    price: offer.price,
                                    id: offer._id,
                                }}
                            >
                                <button>Acheter</button>
                            </Link>
                        ) : (
                            <button disabled>Acheter</button>
                        )}
                    </aside>
                </div>
            </main>
        </>
    );
};

export default Offer;
