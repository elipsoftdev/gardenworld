/** @type {import('next').NextConfig} */

// En GitHub Actions, GITHUB_REPOSITORY viene como "usuario/nombre-repo".
// Si el repo se llama "usuario.github.io" (repo de usuario/organización),
// el sitio vive en la raíz y NO necesita basePath.
// Si es un repo normal ("usuario/gardenworld"), GitHub Pages lo sirve en
// https://usuario.github.io/gardenworld/  y SÍ necesita basePath.
const repoFull = process.env.GITHUB_REPOSITORY || '';
const repoName = repoFull.split('/')[1] || '';
const isUserOrOrgPage = repoName.endsWith('.github.io');
const basePath = repoName && !isUserOrOrgPage ? `/${repoName}` : '';

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
};

module.exports = nextConfig;
