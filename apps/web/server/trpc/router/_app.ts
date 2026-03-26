import { router } from "../trpc"
import { postRouter } from "./post"
import { userRouter } from "./user"
import { followRouter } from "./follow"
import { storyRouter } from "./story"
import { notificationRouter } from "./notification"
import { profileRouter } from "./profile"
import { bookRouter } from "./book"
import { movieRouter } from "./movie"
import { placeRouter } from "./place"
import { goalRouter } from "./goal"
import { hashtagRouter } from "./hashtag"
import { messageRouter } from "./message"
import { blockRouter } from "./block"
import { searchRouter } from "./search"
import { collectionRouter } from "./collection"
import { reportRouter } from "./report"
import { closeFriendRouter } from "./closefriend"

export const appRouter = router({
  post: postRouter,
  user: userRouter,
  follow: followRouter,
  story: storyRouter,
  notification: notificationRouter,
  profile: profileRouter,
  book: bookRouter,
  movie: movieRouter,
  place: placeRouter,
  goal: goalRouter,
  hashtag: hashtagRouter,
  message: messageRouter,
  block: blockRouter,
  search: searchRouter,
  collection: collectionRouter,
  report: reportRouter,
  closeFriend: closeFriendRouter,
})

export type AppRouter = typeof appRouter
