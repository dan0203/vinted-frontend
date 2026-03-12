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
                    <div className="container">
                        <div className="highlight">
                            <h1>Prêts à faire du tri dans vos placards ?</h1>
                            <button>Commencer à vendre</button>
                        </div>
                    </div>
                </div>

                <div className="container">
                    {offers
                        .sort((a, b) => new Date(b.product_date) - new Date(a.product_date))
                        .map(offer => {
                            const productDetails = {};

                            for (let i = 0; i < offer.product_details.length; i++) {
                                productDetails[Object.entries(offer.product_details[i])[0][0]] = Object.entries(offer.product_details[i])[0][1];
                            }

                            return (
                                <Link to={`/offers/${offer._id}`} key={offer._id}>
                                    <article>
                                        <p className="user-info">
                                            <img src={offer.owner.account.avatar.url} alt={offer.owner.account.username} />
                                            <span>{offer.owner.account.username}</span>
                                        </p>
                                        <img src={offer.product_image.url} alt={offer.product_description} />
                                        <p className="price">{offer.product_price} €</p>
                                        {productDetails['TAILLE'] !== undefined && <p className="size">{productDetails['TAILLE']}</p>}
                                        {productDetails['MARQUE'] !== undefined && <p className="marque">{productDetails['MARQUE']}</p>}
                                    </article>
                                </Link>
                            );
                        })}
                    ;
                </div>
            </main>
        </>
    );
};

export default Home;
