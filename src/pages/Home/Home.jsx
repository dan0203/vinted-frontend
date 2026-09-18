import './Home.css';
import tear from '../../assets/images/tear.png';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';

const Home = ({ search }) => {
    const [offers, setOffers] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [sort, setSort] = useState('');
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);

    const filterKey = `${search}|${priceMin}|${priceMax}|${sort}`;
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey);
        setPage(1);
    }

    const isFirstRun = useRef(true);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const requestId = ++requestIdRef.current;

        const fetchData = async () => {
            const params = { page };

            if (search) {
                params.title = search;
            }
            if (priceMin !== '' && !Number.isNaN(Number(priceMin))) {
                params.priceMin = Number(priceMin);
            }
            if (priceMax !== '' && !Number.isNaN(Number(priceMax))) {
                params.priceMax = Number(priceMax);
            }
            if (sort) {
                params.sort = sort;
            }

            try {
                const response = await axios.get(import.meta.env.VITE_API_URL + '/offers', {
                    params,
                });

                if (requestId !== requestIdRef.current) return;

                setOffers(response.data.offers);
                setPageCount(response.data.totalPages || 1);
                setError(null);
            } catch (error) {
                if (requestId !== requestIdRef.current) return;

                setError(error);
            } finally {
                if (requestId === requestIdRef.current) {
                    setIsLoading(false);
                }
            }
        };

        // The first fetch (page load) runs immediately; only fetches
        // triggered by a later search/filter/sort/page change are debounced.
        if (isFirstRun.current) {
            isFirstRun.current = false;
            fetchData();
            return;
        }

        const timeout = setTimeout(fetchData, 400);
        return () => clearTimeout(timeout);
    }, [search, priceMin, priceMax, sort, page]);

    return isLoading ? (
        <p className="loading">Chargement en cours...</p>
    ) : error ? (
        <main className="main-home">
            <div className="container">
                <ErrorMessage error={error} />
            </div>
        </main>
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

                <div className="container filters">
                    <input
                        type="number"
                        className="price-filter"
                        value={priceMin}
                        onChange={event => setPriceMin(event.target.value)}
                        placeholder="Prix min"
                    />
                    <input
                        type="number"
                        className="price-filter"
                        value={priceMax}
                        onChange={event => setPriceMax(event.target.value)}
                        placeholder="Prix max"
                    />
                    <select value={sort} onChange={event => setSort(event.target.value)}>
                        <option value="">Plus pertinents</option>
                        <option value="price-asc">Prix croissant</option>
                        <option value="price-desc">Prix décroissant</option>
                    </select>
                </div>

                {offers.length === 0 ? (
                    <div className="container">
                        <p className="no-results">
                            Aucun article ne correspond à votre recherche.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="container">
                            {offers.map(offer => (
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

                        <div className="container pagination">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(current => current - 1)}
                            >
                                Précédent
                            </button>
                            <span>
                                Page {page} / {pageCount}
                            </span>
                            <button
                                disabled={page >= pageCount}
                                onClick={() => setPage(current => current + 1)}
                            >
                                Suivant
                            </button>
                        </div>
                    </>
                )}
            </main>
        </>
    );
};

export default Home;
