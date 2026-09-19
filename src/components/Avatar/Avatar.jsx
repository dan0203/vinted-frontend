import './Avatar.css';
import { imageUrl } from '../../utils/images';
import { useBrokenUrls } from '../../utils/useBrokenUrls';

// Any account without a usable avatar falls back to its initial rather than a
// hole, so the seller row keeps its alignment whether the image is missing,
// dead, or fine.
const Avatar = ({ account }) => {
    const { usable, markBroken } = useBrokenUrls();
    const url = usable(imageUrl(account.avatar));

    return url ? (
        <img className="avatar" src={url} alt={account.username} onError={() => markBroken(url)} />
    ) : (
        // Decorative: the username is right next to it.
        <span className="avatar avatar-initial" aria-hidden="true">
            {account.username?.charAt(0).toUpperCase()}
        </span>
    );
};

export default Avatar;
