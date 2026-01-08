import MainNavBar from "../components/shared/MainNavBar";

export default function ErrorPage() {
  return <>
    <MainNavBar />
    <main>
      <h1>An error occurred!</h1>
      <p>Could not find this page!</p>
    </main>
  </>
}
