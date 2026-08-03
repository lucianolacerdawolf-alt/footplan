import type { SocialPost } from '../engine/socialFeed';
import styles from './SocialFeedCard.module.css';

interface Props {
  posts: SocialPost[];
}

export default function SocialFeedCard({ posts }: Props) {
  if (posts.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles.title}>📱 FC Hub</div>
      <div className={styles.list}>
        {posts.map(p => (
          <div key={p.id} className={styles.post}>
            <div className={styles.postHead}>
              <span className={styles.author}>{p.author}</span>
              <span className={styles.handle}>{p.handle}</span>
            </div>
            <div className={styles.content}>{p.content}</div>
            <div className={styles.likes}>❤️ {p.likes.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
