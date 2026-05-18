import PolicyLayout from "./PolicyLayout";

export default function Copyright() {
  const year = new Date().getFullYear();
  return (
    <PolicyLayout
      title="Copyright y Propiedad Intelectual"
      intro={`Este sitio web y su contenido tienen derechos de autor de Holman Global Group LLC — © Holman Global Group LLC ${year}. Todos los derechos reservados.`}
    >
      <h2>Restricciones de Distribución</h2>
      <p>
        Se prohíbe cualquier redistribución o reproducción de parte o la
        totalidad del contenido en cualquier forma que no sea la siguiente:
      </p>

      <h3>Uso Personal</h3>
      <p>
        Puede imprimir o descargar extractos en un disco duro local
        únicamente para su uso personal y no comercial.
      </p>

      <h3>Uso Informativo</h3>
      <p>
        Puede copiar el contenido a terceros individuales para su uso
        personal, pero solo si reconoce el sitio web como la fuente del
        material.
      </p>

      <h3>Prohibición de Explotación Comercial</h3>
      <p>
        No puede, excepto con nuestro permiso expreso por escrito, distribuir
        o explotar comercialmente el contenido. Tampoco podrá transmitirlo
        ni almacenarlo en ningún otro sitio web u otra forma de sistema de
        recuperación electrónica.
      </p>
    </PolicyLayout>
  );
}
