import './Header.css';
import { Link, useNavigate } from 'react-router';
import logo from '../../assets/images/logo-vinted.png';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import client from '../../api/client';

const Header = ({ search, setSearch, handleToken, token }) => {
    const navigate = useNavigate();

    return (
        <header>
            <div className="container">
                <Link to="/">
                    <img src={logo} alt="Logo Vinted" />
                </Link>
                <div className="search">
                    <HiMagnifyingGlass className="magnifying-glass" />
                    <input
                        type="text"
                        name="search"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Recherche des articles"
                    />
                </div>
                {token ? (
                    <button
                        className="logout"
                        onClick={async () => {
                            try {
                                await client.post('/users/logout', {}, { skipAuthRedirect: true });
                            } catch {
                                // best-effort: the local session ends either way
                            } finally {
                                handleToken(null);
                                navigate('/');
                            }
                        }}
                    >
                        Se déconnecter
                    </button>
                ) : (
                    <div className="auth-buttons">
                        <Link to="/signup">
                            <button>S'inscrire</button>
                        </Link>
                        <Link to="/login">
                            <button>Se connecter</button>
                        </Link>
                    </div>
                )}
                <Link to="/publish">
                    <button>Vends tes articles</button>
                </Link>
            </div>
        </header>
    );
};

export default Header;
