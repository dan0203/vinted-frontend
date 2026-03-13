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
                        .sort((a, b) => new Date(b.product_date) - new Date(a.product_date))
                        .map(offer => {
                            // Reconstitution du tableau des détails du produit pour un affichage plus sûr
                            offer.productDetails = {};

                            // Pour chaque élément de product_details de l'offre en cours de mapping,
                            //  on récupère ses pairs key/value,
                            //  et on crée une entrée dans le tableau productDetails dont :
                            //      - l'indice sera la key (Object.entries(offer.product_details[i])[0][0])
                            //      - la valeur sera la value (Object.entries(offer.product_details[i])[0][1])
                            for (let i = 0; i < offer.product_details.length; i++) {
                                const entry = Object.entries(offer.product_details[i])[0];
                                offer.productDetails[entry[0]] = entry[1];
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
                                        {/* POINT 2 : on affiche les détails s'ils existent dans le tableau productDetails */}
                                        {offer.productDetails['TAILLE'] !== undefined && <p className="size">{offer.productDetails['TAILLE']}</p>}
                                        {offer.productDetails['MARQUE'] !== undefined && <p className="marque">{offer.productDetails['MARQUE']}</p>}
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
