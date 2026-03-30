import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/backoffice',
      permanent: true,
    },
  };
};

export default function Home() {
  return null;
}
