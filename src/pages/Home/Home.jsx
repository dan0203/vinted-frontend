import './Home.css';
import tear from '../../assets/images/tear.png';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router';

const Home = () => {
    const [offers, setOffers] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(import.meta.env.VITE_API_URL + '/offers');

                setOffers(response.data.offers);
                setIsLoading(false);
            } catch (error) {
                error.message && console.log(error.message);
                error.response && console.log(error.response.data);
            }
        };

        fetchData();
    }, []);

    return isLoading ? (
        <p className="loading">Chargement en cours...</p>
    ) : (
        <>
            <main className="main-home">
                <div className="hero">
                    <img className="forme" src={tear} />
                    <div className="container">
                        <div className="highlight">
                            <h1>Prêts à faire du tri dans vos placards ?</h1>
                            <button>Commencer à vendre</button>
                        </div>
                    </div>
                </div>

                <div className="container">
                    {offers
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .map(offer => (
                            <Link to={`/offers/${offer._id}`} key={offer._id}>
                                <article>
                                    <p className="user-info">
                                        {offer.owner.account.avatar && (
                                            <img
                                                src={offer.owner.account.avatar.url}
                                                alt={offer.owner.account.username}
                                            />
                                        )}
                                        <span>{offer.owner.account.username}</span>
                                    </p>
                                    {offer.image && (
                                        <img src={offer.image.url} alt={offer.name} />
                                    )}
                                    <p className="price">{offer.price} €</p>
                                    {offer.details?.size !== undefined && (
                                        <p className="size">{offer.details.size}</p>
                                    )}
                                    {offer.details?.brand !== undefined && (
                                        <p className="marque">{offer.details.brand}</p>
                                    )}
                                </article>
                            </Link>
                        ))}
                </div>
            </main>
        </>
    );
};

export default Home;
